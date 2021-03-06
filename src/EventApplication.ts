import superjson from "superjson";
import type { TypedEvent, TypedEventConstructor, TypedEventTarget } from "./typed-event";
import PromiseProperty from "./PromiseProperty";
import AppIDB from "./AppIDB";
import WebSocketMessage from "./WebSocketMessage";
import { ProfileLoader } from "./profile";

type ApplicationEventType = "statechange" | "dbopeningfailure" | "dberror";

// DOM Event Object
const EventObject = Event as TypedEventConstructor;

export type DBState = "uninitialized" | "opening" | "blocked" | "open" | "registering" | "error";

export type WsState = "uninitialized" | "connecting" | "hello" | "online" | "syncing" | "offline";

class EventApplication extends EventTarget implements TypedEventTarget<ApplicationEventType> {

  private eventId: number;
  private db: AppIDB;
  private ws: PromiseProperty<WebSocket>;
  private profile: ProfileLoader;
  private _dbState: DBState = "uninitialized";
  private _wsState: WsState = "uninitialized";
  private WS_TIMEOUT_DELAY_INITIAL = 1000;
  private wsTimeoutDelay: number = this.WS_TIMEOUT_DELAY_INITIAL;
  private wsTimeoutId?: number;

  set dbState(value: DBState) {
    this._dbState = value;
    this.dispatchEvent(new EventObject("statechange"));
  }
  get dbState(): DBState { return this._dbState; }

  set wsState(value: WsState) {
    this._wsState = value;
    this.dispatchEvent(new EventObject("statechange"));
  }
  get wsState(): WsState { return this._wsState; }

  constructor({ eventId, idb, profile }: { eventId: number, idb: AppIDB, profile: ProfileLoader }) {
    super();

    this.eventId = eventId;
    this.profile = profile;
    this.db = idb;
    this.ws = new PromiseProperty<WebSocket>();
  }

  // ブラウザのみで実行されるcomponentDidMountから呼ぶ。
  async initialize() {
    this.profile.initialize();
    this.openDB();
    this.openWs();

    window.addEventListener("beforeunload", () => {
      this.wsBye();
    })
    window.addEventListener("online", () => {
      this.resumeWs();
    });
  }

  // 以下、IndexedDB関係

  private openDB() {
    const self = this;

    this.db.open({
      blocked() {
        self.dbState = "blocked";
      },
      terminated() {
        self.dbState = "error";
        self.dispatchEvent(new EventObject("dberror"));
      },
    }).then(() => {
      this.dbState = "open";
    }).catch(() => {
      this.dbState = "error";
      this.dispatchEvent(new EventObject("dbopeningfailure"));
    });

    this.dbState = "opening";
  }

  async register(
    {items, totalAmount}: { items: { itemId: number, number: number }[], totalAmount: number}
  ) {
    if (items.length === 0) {
      return;
    }
    const salesRecord = {
      code: randomUUID(),
      timestamp: new Date(),
      totalAmount,
      eventId: this.eventId,
      items,
    };

    this.dbState = "registering";
    // エラーは呼び出し元でcatchする。
    await (
      (await this.db).add("sales_records", salesRecord)
    );
    this.dbState = "open";

    /*
      registerメソッドの責務はIndexedDBに保存することまでであり、
      いつsyncするかはApplicationクラスに委ねられている。
      したがってsyncが済んでいることを（そもそも行われることも）
      保証するものではないので、戻り値のPromiseをawaitで待ち受けることはしない。
    */
    this.triggerSync();
  }

  // 以下、WebSocket関係

  private wsMessageReceived = (e: MessageEvent) => {
    if (typeof e.data !== "string") {
      throw new TypeError;
    }
    const message = superjson.parse(e.data) as WebSocketMessage.Downward;
    switch (message.type) {
      case "server-hello":
        this.wsHelloReceived(e.target as WebSocket);
        break;
      case "stored":
        this.wsSynced(message.data);
        break;
      case "ping":
        this.wsPingReceived();
        break;
    }
  }

  private async wsSend(message: WebSocketMessage.Upward) {
    (await this.ws).send(superjson.stringify(message));
  }

  private async openWs() {
    const url = new URL(location.href);
    url.pathname = "/ws";
    url.protocol = url.protocol.replace("http", "ws");
    const ws = new WebSocket(url);
    this.wsState = "connecting";

    ws.onopen = () => {
      this.wsTimeoutDelay = this.WS_TIMEOUT_DELAY_INITIAL;
      this.wsState = "hello";
      this.wsSendHello(ws);
    };
    ws.onmessage = this.wsMessageReceived;
    ws.onclose = this.wsClosed;
    // WebSocketにはerrorイベントもあるが、必ずcloseイベントが後続するので、listenしなくてよい。
    // https://html.spec.whatwg.org/multipage/web-sockets.html

    return this.ws;
  }

  // this.wsはhelloの後でresolveするので、WebSocketオブジェクトは引数で受け取る。
  private async wsSendHello(ws: WebSocket) {
    const client = await this.profile.getAsync();
    const data = { eventId: this.eventId, clientId: client.id };
    const message: WebSocketMessage.Upward = { type: "client-hello", data };
    ws.send(superjson.stringify(message));
  }

  // this.wsはこのメソッドの中でresolveするので、WebSocketオブジェクトは引数で受け取る。
  private async wsHelloReceived(ws: WebSocket) {
    this.wsState = "online";
    this.ws.resolve(ws);
    this.sync();
  }

  private wsClosed = (e: CloseEvent) => {
    this.wsState = "offline";
    this.ws = new PromiseProperty<WebSocket>();
    if (e.code === 1000) {
      return;
    }
    this.wsTimeoutId = window.setTimeout(() => {
      this.wsTimeoutDelay *= 2;
      this.resumeWs();
    }, this.wsTimeoutDelay);
  }

  private async resumeWs() {
    await this.reopenWs();
    this.sync();
  }

  private async reopenWs() {
    // > clearTimeout() へ妥当ではない ID を渡しても、何の効果もありません。例外は発生しません。
    // https://developer.mozilla.org/ja/docs/Web/API/clearTimeout
    window.clearTimeout(this.wsTimeoutId);
    await this.openWs();
  }

  private async triggerSync() {
    if (this.wsState === "offline") {
      await this.reopenWs();
    }
    await this.sync();
  }

  private async sync() {
    const salesRecords = await (await this.db).getAll("sales_records");
    if (salesRecords.length !== 0) {
      this.wsState = "syncing";
      this.wsSend({ type: "store", data: salesRecords });
    }
  }

  private async wsSynced(data: WebSocketMessage.Stored) {
    const tx = (await this.db).transaction("sales_records", "readwrite");
    await Promise.all([...data.map(code => tx.store.delete(code)), tx.done]);
    this.wsState = "online";
  }

  private wsPingReceived() {
    // TODO
  }

  private async wsBye() {
    const salesRecords = await (await this.db).getAll("sales_records");
    if (salesRecords.length === 0) {
      await this.wsSend({ type: "bye" });
      (await this.ws).close(1000);
    }
  }
};

function randomUUID() {
  if (!("randomUUID" in crypto)) {
    crypto.randomUUID = function randomUUID() {
      const randomValues = crypto.getRandomValues(new Uint16Array(8));
      randomValues[3] = (randomValues[3] & 0x0fff) | 0x4000;
      randomValues[4] = (randomValues[4] & 0x3fff) | 0x8000;
      const hex = Array.from(randomValues).map(x => x.toString(16))
      return `${ hex[0] }${ hex[1] }-${ hex[2] }-${ hex[3] }-${ hex[4] }-${ hex[5] }${ hex[6] }${ hex[7] }`;
    }
  }
  return crypto.randomUUID!();
}

export default EventApplication;
