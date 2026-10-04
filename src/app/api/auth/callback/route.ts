import { NextResponse } from "next/server";
import { makeAuthCallback } from "@/composition/auth/make-auth-callback";
import { createClient } from "@/lib/db/supabase-server";
import { createSessionToken, Role } from "@/lib/auth/session-token";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) {
    next = "/";
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth-code-error`);
  }

  try {
    const authCallback = makeAuthCallback();
    const redirectPath = await authCallback.execute(code, next);

    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";

    let redirectUrl = `${origin}${redirectPath}`;
    if (!isLocalEnv && forwardedHost) {
      redirectUrl = `https://${forwardedHost}${redirectPath}`;
    }

    const response = NextResponse.redirect(redirectUrl);

    // Sync session_token cookie on the redirect response
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        let userId = user.id;
        const { data: userData } = await supabase
          .from("users")
          .select("user_id")
          .eq("auth_id", user.id)
          .maybeSingle();

        if (userData?.user_id) {
          userId = userData.user_id;
        }

        const customClaims = user.user_metadata?.custom_claims;
        const roles =
          customClaims?.roles ||
          user.user_metadata?.roles ||
          user.app_metadata?.roles ||
          [];
        const rawRole = Array.isArray(roles) ? roles[0] : String(roles || "");
        let appRole: Role = "Student";
        if (rawRole.toLowerCase().includes("admin")) appRole = "Admin";
        else if (
          rawRole.toLowerCase().includes("staff") ||
          rawRole.toLowerCase().includes("department")
        )
          appRole = "Staff";
        else appRole = "Student";

        let department = "";
        if (appRole === "Staff" && userId) {
          const { data: deptData } = await supabase
            .from("clearance_templates")
            .select("clearance_departments(dept_name)")
            .eq("staff_id", userId)
            .limit(1)
            .maybeSingle();
          if (deptData?.clearance_departments) {
            const d = deptData.clearance_departments as unknown as { dept_name: string } | { dept_name: string }[];
            department = Array.isArray(d) ? d[0]?.dept_name || "" : d?.dept_name || "";
          }
        }

        const sessionToken = await createSessionToken({
          user_id: userId,
          user_email: user.email || "",
          user_name: user.user_metadata?.full_name || user.email || "",
          role: appRole,
          department,
        });

        response.cookies.set("session_token", sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 24 * 60 * 60,
        });
      }
    } catch (cookieErr) {
      console.error("Error setting session_token cookie in callback:", cookieErr);
    }

    return response;
  } catch (error) {
    console.error("Auth callback execution error:", error);
    return NextResponse.redirect(`${origin}/auth-error`);
  }
}
