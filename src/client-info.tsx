import React, { useEffect } from "react";
import { Client } from "@prisma/client";
import AppIDB from "./AppIDB";

export class ClientInfo {

  private data?: Client;
  private idb: AppIDB;
  private promise: Promise<Client>;
  private resolutionFunc?: (value: Client | PromiseLike<Client>) => void;
  private rejectionFunc?: (reason?: any) => void;
  private initialized: boolean = false;

  constructor({ idb }: { idb: AppIDB }) {
    this.idb = idb;
    this.promise = new Promise((resolutionFunc, rejectionFunc) => {
      this.resolutionFunc = resolutionFunc;
      this.rejectionFunc = rejectionFunc;
    })
  }

  private resolve(data: Client) {
    this.data = data;
    this.resolutionFunc!(data);
  }

  private reject(reason?: any) {
    this.rejectionFunc!(reason);
  }

  // ブラウザのみで実行されるcomponentDidMountから呼ぶ。
  async initialize() {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    const dbData = await (await this.idb.open()).get("info", "client");
    if (dbData) {
      this.resolve(dbData);
      return;
    }
    const response = await fetch("/api/clients/new", { method: "POST" });
    if (!response.ok) {
      this.reject!(await response.json());
    }
    const fetchedData = await response.json();
    await (await this.idb).put("info", fetchedData, "client");
    this.resolve(await fetchedData as Client);
  }

  getOrThrow(): Client {
    if (this.data) {
      return this.data;
    } else {
      throw this.promise;
    }
  }

  getAsync(): Promise<Client> {
    return this.promise;
  }
}

export const ClientName: React.FC<{ info: ClientInfo }> = ({ info }) => {
  useEffect(() => {
    info.initialize();
  }, [info]);
  return (
    <>
      { info.getOrThrow().name }
    </>
  );
};
