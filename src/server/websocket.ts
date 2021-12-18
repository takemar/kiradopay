import { WebSocketServer } from "ws";
import { PrismaClient } from "@prisma/client"
import WebSocketMessage from "../WebSocketMessage";
import names from "../names.json";

type ConnectionInfo = { clientId: number | null, eventId: number | null };

const prisma = new PrismaClient();

export default function webSocketServer(
  { dev = false, ...options }: ConstructorParameters<typeof WebSocketServer>[0] & { dev?: boolean },
  ...rest: ConstructorParameters<typeof WebSocketServer> extends [any?, ...infer T] ? T : []
) {
  const wss =  new WebSocketServer(options);
  wss.on("connection", ws => {
    const connectionInfo: ConnectionInfo = { clientId: null, eventId: null };
    ws.on("message", async (rawData, isBinary) => {
      if (isBinary) {
        throw new TypeError;
      }
      if (dev) {
        console.log(rawData.toString());
      }
      const message = JSON.parse(rawData.toString()) as WebSocketMessage.Upward;

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
          await bye(connectionInfo);
          ws.close(1000);
          return;
      }
      ws.send(JSON.stringify(response));
    });
  });
  return wss;
}

async function handleClientHello(data: WebSocketMessage.ClientHello, connectionInfo: ConnectionInfo) {
  connectionInfo.eventId = data.eventId;
  if (data.clientId) {
    connectionInfo.clientId = data.clientId;
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
    return { type: "server-hello", data: {}};
  } else {
    const client = await prisma.client.create({
      data: {
        name: names[Math.floor(Math.random() * names.length)],
        openningEvents: {
          connect: [{ id: data.eventId }],
        },
      },
    });
    connectionInfo.clientId = client.id;
    return { clientInfo: client };
  }
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

async function bye(connectionInfo: ConnectionInfo) {
  if (!(connectionInfo.clientId && connectionInfo.eventId)) {
    throw new Error;
  }
  await prisma.client.update({
    where: {
      id: connectionInfo.clientId,
    },
    data: {
      openningEvents: {
        disconnect: [{ id: connectionInfo.eventId }],
      },
    },
  });
}
