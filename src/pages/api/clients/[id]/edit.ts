import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<never>
) {
  // HTTPの仕様上、GETメソッドとHEADメソッドは必須。
  if (req.method === "GET" || req.method === "HEAD") {
    return res.status(400).end();
  }
  else if (req.method !== "POST"){
    return res.status(405).setHeader("Allow", "GET, HEAD, POST").end();
  }

  const id = parseInt(req.query.id as string);

  if (!(
    !Number.isNaN(id)
    &&
    req.body
    &&
    typeof req.body.name === "string"
  )) {
    return res.status(400).end();
  }

  const prisma = new PrismaClient();
  const result = await prisma.client.update({
    where: {
      id: id,
    },
    data: {
      name: req.body.name,
    },
  });
  if (!result) {
    return res.status(400).end();
  }
  return res.status(303).setHeader("Location", "/").end();
}
