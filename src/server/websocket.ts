import { WebSocketServer } from "ws";

export default function listenWss(wsServer: WebSocketServer, dev: boolean) {
  wsServer.on("connection", ws => {
    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        throw new TypeError;
      }
      if (dev) {
        console.log(data.toString());
      }
      if (JSON.parse(data.toString()).type === "client-hello") {
        ws.send(JSON.stringify({ type: "server-hello", data: {} }));
      }
    });
  });
}
