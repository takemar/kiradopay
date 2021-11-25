import express from "express";
import next from "next";

const server = express();
const app = next({ dev: process.env.NODE_ENV !== "production" });
const handle = app.getRequestHandler();
app.prepare().then(() => {
  server.all("*", (req, res) => handle(req, res));
  server.listen(process.env.PORT || 3000);
});
