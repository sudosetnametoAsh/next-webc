import { NextRequest, NextResponse } from "next/server";
import { createClient } from "./lib/db/supabase-server";

export async function proxy(request: NextRequest) {
  const { origin, pathname } = request.nextUrl;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (
    pathname === "/api/auth/callback" ||
    pathname === "/api/auth/clear-session" ||
    pathname === "/api/session" ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/admin/enrollments/import") ||
    pathname.startsWith("/api/admin/simulation")
  ) {
    return NextResponse.next();
  }

  if (!user && pathname !== "/") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(`${origin}/`);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-path", pathname);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/api/:path*",
    "/student/:path*",
    "/department/:path*",
    "/admin/:path*",
  ],
};
