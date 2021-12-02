import express from "express";
import { WebSocketServer } from "ws";
import next from "next";
import type { Socket } from "net";
import listenWss from "./websocket";

const dev = process.env.NODE_ENV !== "production";

const expressServer = express();
const wsServer = new WebSocketServer({ noServer: true });
listenWss(wsServer, dev);
const app = next({ dev });
const handle = app.getRequestHandler();
app.prepare().then(() => {
  expressServer.all("*", (req, res) => handle(req, res));
  const httpServer = expressServer.listen(process.env.PORT || 3000);
  httpServer.on("upgrade", (req, socket, head) => {
    if (req.url === "/ws") {
      wsServer.handleUpgrade(req, socket as Socket, head, ws => {
        wsServer.emit("connection", ws, req);
      });
    }
  });
});
