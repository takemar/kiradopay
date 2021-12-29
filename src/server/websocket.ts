import { WebSocketServer } from "ws";
import type WebSocket from "ws";
import { PrismaClient } from "@prisma/client"
import superjson from "superjson";
import WebSocketMessage from "../WebSocketMessage";

type ConnectionInfo = { clientId: number | null, eventId: number | null };
export type WebSocketWithInfo = WebSocket & { info?: ConnectionInfo };

const prisma = new PrismaClient();

export default function webSocketServer(
  { dev = false, ...options }: ConstructorParameters<typeof WebSocketServer>[0] & { dev?: boolean },
  ...rest: ConstructorParameters<typeof WebSocketServer> extends [any?, ...infer T] ? T : []
) {
  const wss =  new WebSocketServer(options, ...rest);
  wss.on("connection", (ws: WebSocketWithInfo) => {
    const connectionInfo: ConnectionInfo = { clientId: null, eventId: null };
    ws.info = connectionInfo;
    ws.on("message", async (rawData, isBinary) => {
      if (isBinary) {
        throw new TypeError;
      }
      if (dev) {
        console.log(rawData.toString());
      }
      const message = superjson.parse(rawData.toString()) as WebSocketMessage.Upward;

      let response: WebSocketMessage.Downward;
      switch (message.type) {
        case "client-hello":
          response = {
            type: "server-hello",
            data: await handleClientHello(message.data, connectionInfo),
          };
          break;
        case "store":
          response = {
            type: "stored",
            data: await handleStoreRequest(message.data, connectionInfo),
          };
          break;
        case "bye":
          await bye(wss, ws);
          ws.close(1000);
          return;
      }
      ws.send(superjson.stringify(response));
    });
  });
  return wss;
}

async function handleClientHello(data: WebSocketMessage.ClientHello, connectionInfo: ConnectionInfo) {
  connectionInfo.eventId = data.eventId;
  connectionInfo.clientId = data.clientId;
  /*
  await prisma.event.update({
    where: {
      id: data.eventId
    },
    data: {
      openningClients: {
        connect: [{ id: data.clientId }]
      }
    }
  });
  */
  return {};
}

async function handleStoreRequest(data: WebSocketMessage.Store, connectionInfo: ConnectionInfo) {
  if (!connectionInfo.clientId) {
    throw new Error;
  }
  for (let { code, items, ...salesRecord } of data) {
    await prisma.salesRecord.upsert({
      where: { code },
      update: {},
      create: {
        code,
        clientId: connectionInfo.clientId,
        items: {
          create: items,
        },
        ...salesRecord,
      },
    });
  }
  return data.map(salesRecord => salesRecord.code);
}

async function bye(wss: WebSocketServer,connection: WebSocketWithInfo) {
  /*
  const info = connection.info;
  if (!(info && info.clientId && info.eventId)) {
    throw new Error;
  }

  // まだこのサーバで接続中のクライアントがあれば、終了処理はしない。
  if (
    Array.from(wss.clients).some((ws: WebSocketWithInfo) => (
      ws !== connection && ws.info?.clientId === info.clientId && ws.info?.eventId === info.eventId
    ))
  ) {
    return;
  }

  await prisma.client.update({
    where: {
      id: info.clientId,
    },
    data: {
      openningEvents: {
        disconnect: [{ id: info.eventId }],
      },
    },
  });
  */
}
