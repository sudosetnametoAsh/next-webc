import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, createSessionToken, AppSession, Role } from "@/lib/auth/session-token";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Permanent redirect for deprecated /clearance
  if (pathname.startsWith("/clearance")) {
    return NextResponse.redirect(new URL("/student", request.url), 301);
  }

  // 2. Allow public, static, error, and authentication callback endpoints
  if (
    pathname === "/auth-error" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/session") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 3. Resolve active session from either session_token cookie or Supabase cookies
  let session: AppSession | null = null;
  const token = request.cookies.get("session_token")?.value;

  if (token) {
    session = await verifySessionToken(token);
  }

  let newlyMintedToken: string | null = null;

  // Fallback to Supabase SSR if session_token is not present or expired
  if (!session) {
    const hasSupabaseCookie = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

    if (hasSupabaseCookie) {
      try {
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
          {
            cookies: {
              getAll() {
                return request.cookies.getAll();
              },
              setAll() {},
            },
          }
        );

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const customClaims = user.user_metadata?.custom_claims;
          const roles =
            customClaims?.roles ||
            user.user_metadata?.roles ||
            user.app_metadata?.roles ||
            [];
          const rawRole = Array.isArray(roles) ? roles[0] : String(roles || "");
          let role: Role = "Student";
          if (rawRole.toLowerCase().includes("admin")) role = "Admin";
          else if (
            rawRole.toLowerCase().includes("staff") ||
            rawRole.toLowerCase().includes("department")
          )
            role = "Staff";
          else role = "Student";

          session = {
            user_id: user.id,
            user_email: user.email || "",
            user_name: user.user_metadata?.full_name || user.email || "",
            role,
            department: "",
          };

          // Mint new session token to keep cookies synchronized
          newlyMintedToken = await createSessionToken(session);
        }
      } catch (err) {
        console.error("Supabase session check in proxy failed:", err);
      }
    }
  }

  // 4. Root / route handling: auto-redirect authenticated users to their portal
  if (pathname === "/") {
    if (session) {
      let targetPath = "/student";
      if (session.role === "Admin") {
        targetPath = "/admin/dashboard";
      } else if (session.role === "Staff" || session.role === "Department") {
        targetPath = "/department/dashboard";
      }

      const redirectResponse = NextResponse.redirect(new URL(targetPath, request.url));
      if (newlyMintedToken) {
        redirectResponse.cookies.set("session_token", newlyMintedToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 24 * 60 * 60,
        });
      }
      return redirectResponse;
    }
    return NextResponse.next();
  }

  // 5. Protected route checks: user must be authenticated
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized: Missing session" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { role } = session;

  // 6. Role-Based Access Control Gates
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

  // 7. Inject verified identity headers into request for downstream handlers and RSC
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", session.user_id);
  requestHeaders.set("x-user-role", session.role);
  requestHeaders.set("x-user-department", session.department || "");

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Attach session_token cookie if it was freshly minted from Supabase session
  if (newlyMintedToken) {
    response.cookies.set("session_token", newlyMintedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });
  }

  return response;
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
