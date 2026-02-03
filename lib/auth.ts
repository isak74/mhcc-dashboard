import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "session";

const getSecretKey = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
};

export const getSessionCookieName = () => SESSION_COOKIE;

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

export const parseCookieHeader = (cookieHeader: string | null | undefined) => {
  if (!cookieHeader) return {} as Record<string, string>;
  return cookieHeader.split(";").reduce((acc, part) => {
    const [key, ...valueParts] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(valueParts.join("="));
    return acc;
  }, {} as Record<string, string>);
};

export const getSessionTokenFromRequest = (req: NextRequest) => {
  const cookie = req.cookies.get(SESSION_COOKIE);
  return cookie?.value ?? null;
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

export const buildSessionCookie = (token: string) => {
  const options = getCookieOptions();
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    `Path=${options.path}`,
    "HttpOnly",
    `SameSite=${options.sameSite}`,
  ];
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
};

export const buildLogoutCookie = () => {
  const options = getCookieOptions();
  const parts = [
    `${SESSION_COOKIE}=`,
    "Max-Age=0",
    `Path=${options.path}`,
    "HttpOnly",
    `SameSite=${options.sameSite}`,
  ];
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
};
