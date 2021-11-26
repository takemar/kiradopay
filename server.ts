import express from "express";
import expressWs from "express-ws";
import next from "next";

const s = express();
const wss = expressWs(s).getWss();
const server = s as express.Application as expressWs.Application;
const app = next({ dev: process.env.NODE_ENV !== "production" });
const handle = app.getRequestHandler();
app.prepare().then(() => {
  server.ws("/ws", ws => {
    ws.on("message", data => {
      console.log(data);
      ws.send("message");
    });
  });
  server.all("*", (req, res) => handle(req, res));
  server.listen(process.env.PORT || 3000);
});
