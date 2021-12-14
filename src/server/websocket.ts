import { WebSocketServer } from "ws";
import { PrismaClient } from "@prisma/client"
import WebSocketMessage from "../WebSocketMessage";
import names from "../names.json";

const prisma = new PrismaClient();

export default function webSocketServer(
  { dev = false, ...options }: ConstructorParameters<typeof WebSocketServer>[0] & { dev?: boolean },
  ...rest: ConstructorParameters<typeof WebSocketServer> extends [any?, ...infer T] ? T : []
) {
  const wss =  new WebSocketServer(options);
  wss.on("connection", ws => {
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
            data: await handleClientHello(message.data),
          };
          break;
        case "store":
          throw new Error;
        case "bye":
          // TODO
          return;
      }
      ws.send(JSON.stringify(response));
    });
  });
  return wss;
}

async function handleClientHello(data: WebSocketMessage.ClientHello) {
  if (data.clientId) {
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
        }
      },
    });
    return { clientInfo: client };
  }
}
