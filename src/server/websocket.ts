import { WebSocketServer } from "ws";
import { PrismaClient } from "@prisma/client"
import WebSocketMessage from "../WebSocketMessage";
import names from "../names.json";

const prisma = new PrismaClient();

export default function webSocketServer(
  { dev = false, ...options }: ConstructorParameters<typeof WebSocketServer>[0] & { dev?: boolean },
  ...rest: ConstructorParameters<typeof WebSocketServer> extends [any?, ...infer T] ? T : []
) {
  return new WebSocketServer(options).on("connection", ws => {
    ws.on("message", async (rawData, isBinary) => {
      if (isBinary) {
        throw new TypeError;
      }
      if (dev) {
        console.log(rawData.toString());
      }
      const message = JSON.parse(rawData.toString()) as WebSocketMessage.Upward;

      if (message.type === "client-hello") {
        let response: WebSocketMessage.Downward;
        if (message.data.clientId) {
          await prisma.event.update({
            where: {
              id: message.data.eventId
            },
            data: {
              openningClients: {
                connect: [{ id: message.data.clientId }]
              }
            }
          });
          response = { type: "server-hello", data: {}};
        } else {
          const client = await prisma.client.create({
            data: {
              name: names[Math.floor(Math.random() * names.length)],
              openningEvents: {
                connect: [{ id: message.data.eventId }],
              }
            },
          });
          response = { type: "server-hello", data: { clientInfo: client }};
        }

        ws.send(JSON.stringify(response));
      }
    });
  });
}
