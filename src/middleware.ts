import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/api/validate-token") {
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
    requestHeaders.set("x-user", JSON.stringify(payload));

    // return NextResponse.next({
    //   request: {
    //     headers: requestHeaders,
    //   },
    // });

    return NextResponse.next();
  } catch (err) {
    console.error("Invalid session token:", err);
    return NextResponse.redirect(new URL("/", req.url));
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
