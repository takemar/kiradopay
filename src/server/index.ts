import { createServer } from "http";
import next from "next";
import type { Socket } from "net";
import webSocketServer from "./websocket";

(async () => {
  const dev = process.env.NODE_ENV !== "production";

  const httpServer = createServer();

  const wsServer = webSocketServer({ noServer: true, dev });
  httpServer.on("upgrade", (req, socket, head) => {
    if (req.url === "/ws") {
      wsServer.handleUpgrade(req, socket as Socket, head, ws => {
        wsServer.emit("connection", ws, req);
      });
    }
  });

  const app = next({ dev });
  const handle = app.getRequestHandler();
  await app.prepare();
  httpServer.on("request", (req, res) => {
    handle(req, res);
  });

  httpServer.listen({
    port: process.env.PORT,
    host: process.env.HOST,
  });
})();
