import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, AppSession, Role } from "./session-token";

export async function requireAuth(
  req: NextRequest,
  allowedRoles?: Role[]
): Promise<AppSession> {
  const token = req.cookies.get("session_token")?.value;
  if (!token) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized: Missing session token" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const session = await verifySessionToken(token);
  if (!session) {
    throw new Response(
      JSON.stringify({ error: "Unauthorized: Invalid or expired session" }),
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
