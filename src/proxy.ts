import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth/session-token";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle /clearance redirect to /student
  if (pathname.startsWith("/clearance")) {
    return NextResponse.redirect(new URL("/student", request.url), 301);
  }

  // Public, static, error, and auth callback routes
  if (
    pathname === "/auth-error" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/session") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Extract session token
  const token = request.cookies.get("session_token")?.value;

  // If user is at root / and has a valid session token, redirect directly to their dashboard
  if (pathname === "/") {
    if (token) {
      const session = await verifySessionToken(token);
      if (session) {
        if (session.role === "Admin") {
          return NextResponse.redirect(new URL("/admin/dashboard", request.url));
        } else if (session.role === "Staff" || session.role === "Department") {
          return NextResponse.redirect(new URL("/department/dashboard", request.url));
        } else {
          return NextResponse.redirect(new URL("/student", request.url));
        }
      }
    }
    return NextResponse.next();
  }

  // Protected routes require token
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized: Missing session token" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  const session = await verifySessionToken(token);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized: Invalid or expired session" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("session_token");
    return response;
  }

  const { role } = session;

  // Role gate checks
  if (pathname.startsWith("/admin") && role !== "Admin") {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/auth-error?reason=admin_required", request.url));
  }

  if (pathname.startsWith("/department") && !["Staff", "Department", "Admin"].includes(role)) {
    if (pathname.startsWith("/api/department")) {
      return NextResponse.json({ error: "Forbidden: Faculty or Department staff role required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/auth-error?reason=faculty_required", request.url));
  }

  if (pathname.startsWith("/student") && !["Student", "Admin"].includes(role)) {
    if (pathname.startsWith("/api/student")) {
      return NextResponse.json({ error: "Forbidden: Student role required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/auth-error?reason=student_required", request.url));
  }

  // Pass verified identity headers to downstream handlers and RSC
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", session.user_id);
  requestHeaders.set("x-user-role", session.role);
  requestHeaders.set("x-user-department", session.department || "");

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/department/:path*",
    "/student/:path*",
    "/clearance/:path*",
    "/api/admin/:path*",
    "/api/department/:path*",
    "/api/student/:path*",
  ],
};
