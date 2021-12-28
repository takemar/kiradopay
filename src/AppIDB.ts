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

type BlockedValue = ReturnType<Required<OpenDBCallbacks<DB>>["blocked"]>;
type BlockingValue = ReturnType<Required<OpenDBCallbacks<DB>>["blocking"]>;
type TerminatedValue = ReturnType<Required<OpenDBCallbacks<DB>>["terminated"]>;

export default class AppIDB implements PromiseLike<IDBPDatabase<DB>> {

  private promise: Promise<IDBPDatabase<DB>>;
  private resolutionFunc?: (value: IDBPDatabase<DB> | PromiseLike<IDBPDatabase<DB>>) => void;
  private resolved: boolean = false;
  private blockedPromise: Promise<BlockedValue>;
  private blockedFunc?: (value: BlockedValue | PromiseLike<BlockedValue>) => void;
  private blockingPromise: Promise<BlockingValue>;
  private blockingFunc?: (value: BlockingValue | PromiseLike<BlockingValue>) => void;
  private terminatedPromise: Promise<TerminatedValue>;
  private terminatedFunc?: (value: TerminatedValue | PromiseLike<TerminatedValue>) => void;

  constructor() {
    this.promise = new Promise(resolutionFunc => {
      this.resolutionFunc = resolutionFunc;
    });
    this.blockedPromise = new Promise(resolutionFunc => {
      this.blockedFunc = resolutionFunc;
    });
    this.blockingPromise = new Promise(resolutionFunc => {
      this.blockingFunc = resolutionFunc;
    });
    this.terminatedPromise = new Promise(resolutionFunc => {
      this.terminatedFunc = resolutionFunc;
    });
  }

  then<T, U>(
    onFulfilled?: ((value: IDBPDatabase<DB>) => T | PromiseLike<T>) | undefined | null,
    onRejected?: ((reason: any) => U | PromiseLike<U>) | undefined | null
  ): Promise<T | U> {
    return this.promise.then(onFulfilled, onRejected);
  }

  open({ blocked, blocking, terminated }: Omit<OpenDBCallbacks<DB>, "upgrade">) {
    this.blockedPromise.then(blocked);
    this.blockingPromise.then(blocking);
    this.terminatedPromise.then(terminated);

    const self = this;
    if (!this.resolved) {
      this.resolutionFunc!(openDB("kiradopay", 2, {
        upgrade(db, oldVersion, _newVersion, _transaction) {
          if (oldVersion < 1) {
            db.createObjectStore("sales_records", { keyPath: "code" });
          }
          if (oldVersion < 2) {
            db.createObjectStore("info");
          }
        },
        blocked() {
          self.blockedFunc!();
        },
        blocking() {
          self.blockingFunc!();
        },
        terminated() {
          self.terminatedFunc!();
        }
      }));
      this.resolved = true;
    }
    return this;
  }
}
