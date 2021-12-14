import { Client as ClientModel, SalesRecord } from "@prisma/client";

namespace WebSocketMessage {
  export type ClientHello = {
    clientId?: number,
    eventId: number,
  };
  export type ServerHello = {
    clientInfo?: ClientModel
  };
  export type Store = (Omit<SalesRecord, "clientId"> & { items: { itemId: number, number: number }[] })[];
  export type Stored = string[];
  export type Bye = {
    clientId: number,
  };
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
      data: Bye,
    }
  );
  export type Downward = (
    {
      type: "server-hello",
      data: ServerHello,
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
