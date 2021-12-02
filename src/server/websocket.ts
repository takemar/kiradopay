import { WebSocketServer } from "ws";

type WebSocketServerConstructorParameters = ConstructorParameters<typeof WebSocketServer>;

export default function webSocketServer(
  { dev = false, ...options }: ConstructorParameters<typeof WebSocketServer>[0] & { dev?: boolean },
  ...rest: WebSocketServerConstructorParameters extends [any?, ...infer T] ? T : []
) {
  return new WebSocketServer(options).on("connection", ws => {
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
