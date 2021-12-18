import type { Client, SalesRecord } from "@prisma/client";
import { openDB } from "idb";
import type { DBSchema, IDBPDatabase } from "idb";
import PromiseProperty from "./PromiseProperty";
import WebSocketMessage from "./WebSocketMessage";

type ApplicationEventType = "statechange" | "dbopeningfailure" | "dberror" | "clientinfo";

type TypedEvent<T extends string> = Event & { type: T };

// DOM Event Object
const EventObject = Event as (
  Omit<typeof Event, "new">
  & {
    new<T extends string>(
      type: T,
      ...rest: ConstructorParameters<(typeof Event)> extends [any, ...infer U] ? U : []
    ): TypedEvent<T>;
  }
);

export type DBState = "uninitialized" | "opening" | "blocked" | "open" | "registering" | "error";

export type WsState = "uninitialized" | "connecting" | "hello" | "online" | "syncing" | "offline";

interface DB extends DBSchema {
  info: {
    key: string,
    value: any,
  },
  sales_records: {
    key: string,
    value: Omit<SalesRecord, "clientId"> & { items: { itemId: number, number: number }[] },
  },
}

interface EventApplication extends EventTarget {

  addEventListener(
    type: ApplicationEventType,
    ...rest: Parameters<EventTarget["addEventListener"]> extends [any, ...infer U] ? U : []
  ): ReturnType<EventTarget["addEventListener"]>;

  removeEventListener(
    type: ApplicationEventType,
    ...rest: Parameters<EventTarget["removeEventListener"]> extends [any, ...infer U] ? U : []
  ): ReturnType<EventTarget["removeEventListener"]>;

  dispatchEvent(
    event: TypedEvent<ApplicationEventType>,
    ...rest: Parameters<EventTarget["dispatchEvent"]> extends [any, ...infer U] ? U : []
  ): ReturnType<EventTarget["dispatchEvent"]>;
}

class EventApplication extends EventTarget {

  private eventId: number;
  private db: PromiseProperty<IDBPDatabase<DB>>;
  private ws: PromiseProperty<WebSocket>;
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

  constructor(eventId: number) {
    super();

    this.eventId = eventId;
    this.db = new PromiseProperty<IDBPDatabase<DB>>();
    this.ws = new PromiseProperty<WebSocket>();
  }

  // ブラウザのみで実行されるcomponentDidMountから呼ぶ。
  async initialize() {
    this.openDB();
    this.openWs();

    window.addEventListener("beforeunload", () => {
      this.wsBye();
    })
    window.addEventListener("online", () => {
      this.resumeWs();
    });

    const clientName = await (await this.db).get("info", "clientName") as string | undefined;
    if (clientName) {
      this.dispatchClientInfoEvent(clientName);
    }
  }

  private dispatchClientInfoEvent(clientName: string) {
    const event: (
      TypedEvent<"clientinfo"> & { clientName?: string }
    ) = new EventObject("clientinfo");
    event.clientName = clientName;
    this.dispatchEvent(event);
  }

  // 以下、IndexedDB関係

  private openDB() {
    const self = this;

    this.db.resolve(openDB("kiradopay", 2, {
      upgrade(db, oldVersion, _newVersion, _transaction) {
        if (oldVersion < 1) {
          db.createObjectStore("sales_records", { keyPath: "code" });
        }
        if (oldVersion < 2) {
          db.createObjectStore("info");
        }
      },
      blocked() {
        self.dbState = "blocked";
      },
      terminated() {
        self.dbState = "error";
        self.dispatchEvent(new EventObject("dberror"));
      },
    })).then(() => {
      this.dbState = "open";
    }).catch(() => {
      this.dbState = "error";
      this.dispatchEvent(new EventObject("dbopeningfailure"));
    });

    this.dbState = "opening";
  }

  async register(items: { itemId: number, number: number }[]) {
    if (items.length === 0) {
      return;
    }
    const salesRecord = {
      code: randomUUID(),
      timestamp: new Date(),
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
    const message = JSON.parse(e.data) as WebSocketMessage.Downward;
    switch (message.type) {
      case "server-hello":
        this.wsHelloReceived(message.data, e.target as WebSocket);
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
    (await this.ws).send(JSON.stringify(message));
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
    const clientId = await (await this.db).get("info", "clientId") as number | undefined;
    const helloMessage: WebSocketMessage.ClientHello = { eventId: this.eventId };
    if (clientId) {
      helloMessage.clientId = clientId;
    }
    ws.send(JSON.stringify({ type: "client-hello", data: helloMessage }));
  }

  // this.wsはこのメソッドの中でresolveするので、WebSocketオブジェクトは引数で受け取る。
  private async wsHelloReceived(data: WebSocketMessage.ServerHello, ws: WebSocket) {
    if (data.clientInfo) {
      const tx = (await this.db).transaction("info", "readwrite");
      await Promise.all([
        tx.store.add(data.clientInfo.id, "clientId"),
        tx.store.add(data.clientInfo.name, "clientName"),
        tx.done,
      ]);
      this.dispatchClientInfoEvent(data.clientInfo.name);
    }
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
