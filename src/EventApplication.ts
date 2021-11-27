import type { Item, SalesRecord } from "@prisma/client";
import { openDB } from "idb";
import type { DBSchema, IDBPDatabase } from "idb";
import { PromiseProperty } from "./PromisePropery";

// DOM Event Object
const EventObject = Event;

export type DBState = "uninitialized" | "opening" | "open" | "registering" | "error";

export type WsState = "uninitialized" | "connecting" | "loading" | "online" | "syncing" | "offline";

interface DB extends DBSchema {
  sales_records: {
    key: string,
    value: Omit<SalesRecord, "clientId"> & { items: { itemId: number, number: number }[] },
  }
}

export default class EventApplication extends EventTarget {

  eventId: number;
  db: PromiseProperty<IDBPDatabase<DB>>;
  ws: PromiseProperty<WebSocket>;
  _dbState: DBState = "uninitialized";
  _wsState: WsState = "uninitialized";

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
  initialize() {
    this.openDB();
    this.openWs();
  }

  openDB() {
    this.db.resolve(openDB("kiradopay", 1, {
      upgrade(db, oldVersion, _newVersion, _transaction) {
        if (oldVersion < 1) {
          db.createObjectStore("sales_records", { keyPath: "code" });
        }
      },
    }));
  }

  openWs() {
    const url = new URL(location.href);
    url.pathname = "/ws";
    url.protocol = url.protocol.replace("http", "ws");
    const ws = new WebSocket(url);
    ws.onopen = () => {
      this.ws.resolve(ws);
    };
    ws.onmessage = ({ data }) => {
      if (typeof data !== "string") {
        throw new TypeError;
      }
      console.log(data);
    };
    (async () => {
      (await this.ws).send("message");
    })();
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

    await (
      (await this.db).add("sales_records", salesRecord)
    );
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
