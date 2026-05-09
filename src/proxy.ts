import { NextRequest, NextResponse } from "next/server";
import { createClient } from "./lib/db/supabase-server";
import { headers } from "next/headers";

export async function proxy(request: NextRequest) {
  const { origin, pathname } = request.nextUrl;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname === "/api/auth/callback") return NextResponse.next();

  // If there is no user AND they are NOT already on the home page, redirect them.
  // (Change "/" to "/login" if your login page is somewhere else)
  if (!user && pathname !== "/") {
    return NextResponse.redirect(`${origin}/`);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-path", pathname);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    // Ensure your matcher isn't accidentally catching static files or Next.js internals
    "/api/:path*",
    "/student/:path*",
    "/department/:path*",
    "/admin/:path*",
    // If you explicitly want the middleware to run on the home page too, you'd add "/" here.
  ],
};
