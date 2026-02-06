import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { JWTExpired } from "jose/errors";

const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (pathname === "/api/session" || pathname.startsWith("/preview")) {
    return NextResponse.next();
  }
  const token = req.cookies.get("session_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    const role = payload.role as string;

    if (pathname.startsWith("/student") && !role.includes("Student")) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (pathname.startsWith("/department") && !role.includes("Staff")) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (pathname.startsWith("/admin") && !role.includes("Admin")) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-session", JSON.stringify(payload));

    return NextResponse.next({request: {headers: requestHeaders}});
  } catch (error) {
    if (error instanceof JWTExpired) {
      const loginUrl = new URL('/', req.url);
      loginUrl.searchParams.set('error', 'session_expired');
      return NextResponse.redirect(loginUrl);
    }

    console.error("Middleware Auth Error:", error);
    return NextResponse.redirect(new URL('/', req.url));
  }
}

export const config = {
  matcher: [
    "/api/:path*",
    "/student/:path*",
    "/department/:path*",
    "/admin/:path*",
  ],
};
