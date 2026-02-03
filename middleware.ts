import { NextRequest, NextResponse } from "next/server";
import { getSessionTokenFromRequest, verifySessionToken } from "./lib/auth";

const PUBLIC_PATHS = ["/login", "/api/login", "/_next", "/favicon.ico"];

const isPublic = (pathname: string) =>
  PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    if (pathname === "/login") {
      const token = getSessionTokenFromRequest(req);
      if (token) {
        try {
          await verifySessionToken(token);
          const url = req.nextUrl.clone();
          url.pathname = "/";
          return NextResponse.redirect(url);
        } catch {
          return NextResponse.next();
        }
      }
    }
    return NextResponse.next();
  }

  const token = getSessionTokenFromRequest(req);
  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  try {
    await verifySessionToken(token);
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
