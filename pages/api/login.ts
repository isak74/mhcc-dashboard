import type { NextApiRequest, NextApiResponse } from "next";
import { buildSessionCookie, signSessionToken } from "../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const { password } = req.body ?? {};
  if (!password || typeof password !== "string") {
    res.status(400).json({ message: "Password is required" });
    return;
  }

  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    res.status(500).json({ message: "APP_PASSWORD is not set" });
    return;
  }

  if (password !== expected) {
    res.status(401).json({ message: "Invalid password" });
    return;
  }

  const token = await signSessionToken();
  res.setHeader("Set-Cookie", buildSessionCookie(token));
  res.status(200).json({ ok: true });
}
