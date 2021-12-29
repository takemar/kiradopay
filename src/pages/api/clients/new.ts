import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import type { Client } from "@prisma/client";
import names from "../../../names.json";

type Data = Client;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // HTTPの仕様上、GETメソッドとHEADメソッドは必須。
  if (req.method === "GET" || req.method === "HEAD") {
    return res.status(400).end();
  }
  else if (req.method !== "POST"){
    return res.status(405).setHeader("Allow", "GET, HEAD, POST").end();
  }

  const prisma = new PrismaClient();
  const client = await prisma.client.create({
    data: {
      name: names[Math.floor(Math.random() * names.length)],
    },
  });
  res.status(200).json(client);
}
