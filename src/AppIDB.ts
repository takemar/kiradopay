import { openDB } from "idb";
import type { DBSchema, IDBPDatabase, OpenDBCallbacks } from "idb";
import type { SalesRecord } from "@prisma/client";

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

export default class AppIDB implements PromiseLike<IDBPDatabase<DB>> {

  promise: Promise<IDBPDatabase<DB>>;
  resolutionFunc?: (value: IDBPDatabase<DB> | PromiseLike<IDBPDatabase<DB>>) => void;

  constructor() {
    this.promise = new Promise<IDBPDatabase<DB>>(resolutionFunc => {
      this.resolutionFunc = resolutionFunc;
    });
  }

  then<T, U>(
    onFulfilled?: ((value: IDBPDatabase<DB>) => T | PromiseLike<T>) | undefined | null,
    onRejected?: ((reason: any) => U | PromiseLike<U>) | undefined | null
  ): Promise<T | U> {
    return this.promise.then(onFulfilled, onRejected);
  }

  open(callbacks: Omit<OpenDBCallbacks<DB>, "upgrade">) {
    this.resolutionFunc!(openDB("kiradopay", 2, {
      upgrade(db, oldVersion, _newVersion, _transaction) {
        if (oldVersion < 1) {
          db.createObjectStore("sales_records", { keyPath: "code" });
        }
        if (oldVersion < 2) {
          db.createObjectStore("info");
        }
      },
      ...callbacks,
    }));
    return this;
  }
}
