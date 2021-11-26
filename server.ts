import express from "express";
import { WebSocketServer } from "ws";
import next from "next";
import type { Socket } from "net";

const expressServer = express();
const wsServer = new WebSocketServer({ noServer: true });
wsServer.on("connection", ws => {
  ws.send("message");
  ws.on("message", (data, isBinary) => {
    console.log(data.toString());
    ws.send(data.toString());
  });
});
const app = next({ dev: process.env.NODE_ENV !== "production" });
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
