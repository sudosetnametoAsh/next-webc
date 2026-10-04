import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, AppSession, Role } from "./session-token";
import { createClient } from "@/lib/db/supabase-server";

export async function requireAuth(
  req: NextRequest,
  allowedRoles?: Role[]
): Promise<AppSession> {
  let session: AppSession | null = null;

  // 1. Try session_token cookie
  const token = req.cookies.get("session_token")?.value;
  if (token) {
    session = await verifySessionToken(token);
  }

  // 2. Try proxy-injected headers
  if (!session) {
    const headerUserId = req.headers.get("x-user-id");
    const headerRole = req.headers.get("x-user-role") as Role | null;
    const headerDept = req.headers.get("x-user-department") || "";
    if (headerUserId && headerRole) {
      session = {
        user_id: headerUserId,
        user_email: "",
        user_name: "",
        role: headerRole,
        department: headerDept,
      };
    }
  }

  // 3. Fallback to Supabase server auth
  if (!session) {
    try {
      const supabase = await createClient();
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
        let appRole: Role = "Student";
        if (rawRole.toLowerCase().includes("admin")) appRole = "Admin";
        else if (
          rawRole.toLowerCase().includes("staff") ||
          rawRole.toLowerCase().includes("department")
        )
          appRole = "Staff";
        else appRole = "Student";

        let userId = user.id;
        const { data: userData } = await supabase
          .from("users")
          .select("user_id")
          .eq("auth_id", user.id)
          .maybeSingle();

        if (userData?.user_id) {
          userId = userData.user_id;
        }

        session = {
          user_id: userId,
          user_email: user.email || "",
          user_name: user.user_metadata?.full_name || user.email || "",
          role: appRole,
          department: "",
        };
      }
    } catch (err) {
      console.error("Supabase fallback in requireAuth failed:", err);
    }
  }

  if (!session) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized: Missing session" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    throw new Response(
      JSON.stringify({ error: "Forbidden: Insufficient role permissions" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return session;
}

export async function authenticateRequest(
  req: NextRequest,
  allowedRoles?: Role[]
): Promise<{ session: AppSession } | { errorResponse: NextResponse }> {
  try {
    const session = await requireAuth(req, allowedRoles);
    return { session };
  } catch (err: any) {
    if (err instanceof Response) {
      try {
        const data = await err.json();
        return { errorResponse: NextResponse.json(data, { status: err.status }) };
      } catch {
        return {
          errorResponse: new NextResponse(err.body, {
            status: err.status,
            headers: err.headers,
          }),
        };
      }
    }
    return {
      errorResponse: NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      ),
    };
  }
}

export function withAuth(
  handler: (
    req: NextRequest,
    session: AppSession,
    ...args: any[]
  ) => Promise<NextResponse | Response>,
  allowedRoles?: Role[]
) {
  return async (req: NextRequest, ...args: any[]) => {
    const auth = await authenticateRequest(req, allowedRoles);
    if ("errorResponse" in auth) {
      return auth.errorResponse;
    }
    return handler(req, auth.session, ...args);
  };
}
