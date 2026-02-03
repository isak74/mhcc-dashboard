import { SignJWT, jwtVerify } from "jose";
import type { Request, Response, NextFunction } from "express";
import * as cookie from "cookie";

const SESSION_COOKIE = "session";

const getSecretKey = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
};

export const signSessionToken = async () => {
  const secretKey = getSecretKey();
  return new SignJWT({ sub: "dashboard" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
};

export const verifySessionToken = async (token: string) => {
  const secretKey = getSecretKey();
  await jwtVerify(token, secretKey);
  return true;
};

export const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    path: "/",
    sameSite: isProd ? "None" : "Lax",
    secure: isProd,
  } as const;
};

export const setSessionCookie = (res: Response, token: string) => {
  const options = getCookieOptions();
  res.setHeader(
    "Set-Cookie",
    cookie.serialize(SESSION_COOKIE, token, {
      httpOnly: options.httpOnly,
      sameSite: options.sameSite,
      secure: options.secure,
      path: options.path,
    })
  );
};

export const clearSessionCookie = (res: Response) => {
  const options = getCookieOptions();
  res.setHeader(
    "Set-Cookie",
    cookie.serialize(SESSION_COOKIE, "", {
      httpOnly: options.httpOnly,
      sameSite: options.sameSite,
      secure: options.secure,
      path: options.path,
      maxAge: 0,
    })
  );
};

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies[SESSION_COOKIE];
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    await verifySessionToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
};

export const hasValidSession = async (req: Request) => {
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies[SESSION_COOKIE];
  if (!token) return false;
  try {
    await verifySessionToken(token);
    return true;
  } catch {
    return false;
  }
};
