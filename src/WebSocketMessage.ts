import { Client as ClientModel, SalesRecord } from "@prisma/client";

namespace WebSocketMessage {
  export type ClientHello = {
    clientId: number,
    eventId: number,
  };
  export type Store = (Omit<SalesRecord, "clientId"> & { items: { itemId: number, number: number }[] })[];
  export type Stored = string[];
  export type Upward = (
    {
      type: "client-hello",
      data: ClientHello,
    }
    |
    {
      type: "store",
      data: Store,
    }
    |
    {
      type: "bye",
    }
  );
  export type Downward = (
    {
      type: "server-hello",
      data: {},
    }
    |
    {
      type: "stored",
      data: Stored,
    }
    |
    {
      type: "ping",
      data: {},
    }
  );
}

export default WebSocketMessage;
