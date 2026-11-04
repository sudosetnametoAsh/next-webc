import { ENROLLMENT_NOTICE_URL } from "@/lib/auth/client-enrollment";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { RoleRouter } from "./modules/auth/domain/role-router";

export async function proxy(request: NextRequest) {
  const { origin, pathname } = request.nextUrl;
  if (
    pathname === "/api/auth/callback" ||
    pathname === "/api/auth/clear-session" ||
    pathname === "/api/auth/enrollment" ||
    pathname === "/api/session" ||
    pathname === "/api/webhooks/cashier"
  ) {
    return NextResponse.next();
  }

  const next = () => {
    // Rebuild headers after cookie refresh so Server Components see the new session.
    const headers = new Headers(request.headers);
    headers.set("x-path", pathname);
    return NextResponse.next({ request: { headers } });
  };
  let response = next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          const previousCookies = response.cookies.getAll();
          response = next();
          previousCookies.forEach(cookie => response.cookies.set(cookie));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  // Verify against Auth: a valid JWT can refer to a user deleted by a DB reset.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error && ["user_not_found", "refresh_token_not_found", "refresh_token_already_used", "session_not_found"].includes(error.code || "")) {
    await supabase.auth.signOut({ scope: "local" });
  }
  const withCookies = (result: NextResponse) => {
    response.cookies.getAll().forEach(cookie => result.cookies.set(cookie));
    return result;
  };

  if (!user && pathname !== "/") {
    if (pathname.startsWith("/api/")) {
      return withCookies(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    return withCookies(NextResponse.redirect(`${origin}/`));
  }

  const roles = RoleRouter.parseRoles(user?.user_metadata?.custom_claims?.roles);
  if (!RoleRouter.canAccess(pathname, roles)) {
    if (pathname.startsWith("/api/")) {
      return withCookies(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    return withCookies(NextResponse.redirect(new URL(RoleRouter.homePath(roles), origin)));
  }

  // Auth accounts outlive enrollment; a stale JWT must not restore removed client access.
  const clientArea = pathname === "/clearance" || pathname.startsWith("/clearance/") || pathname.startsWith("/api/student/");
  if (user && clientArea && !roles.includes("Admin") && !roles.includes("Department")) {
    const { data: identity, error: identityError } = await supabase.from("users")
      .select("user_id, students(student_id), staffs(staff_id)").eq("auth_id", user.id).maybeSingle();
    if (identityError) {
      return withCookies(NextResponse.json({ error: "Unable to verify enrollment. Please try again." }, { status: 503 }));
    }
    const enrolled = identity && ([identity.students, identity.staffs].some((profile) =>
      Array.isArray(profile) ? profile.length > 0 : Boolean(profile)));
    if (!enrolled) {
      await supabase.auth.signOut({ scope: "local" });
      return withCookies(pathname.startsWith("/api/")
        ? NextResponse.json({ error: "Client enrollment is required.", code: "NOT_ENROLLED" }, { status: 403 })
        : NextResponse.redirect(new URL(ENROLLMENT_NOTICE_URL, origin)));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/clearance/:path*",
    "/department/:path*",
    "/admin/:path*",
  ],
};
