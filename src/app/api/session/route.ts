import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createClient } from "@/lib/db/supabase-client";
import { createSessionToken, Role } from "@/lib/auth/session-token";

declare module "jose" {
  interface JWTPayload {
    roles?: string[];
    preferred_username?: string;
    name?: string;
  }
}

const tenantId = process.env.AZURE_AD_TENANT_ID!;
const clientId = process.env.AZURE_AD_CLIENT_ID!;
const supabase = createClient();

const jwks = createRemoteJWKSet(
  new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`),
);

export async function POST(req: NextRequest) {
  try {
    // Extract the token from request body
    const { accessToken } = await req.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing access token" },
        { status: 400 },
      );
    }

    // Verify the access token with Azure AD
    const { payload } = await jwtVerify(accessToken, jwks, {
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      audience: clientId,
    });

    // Extract user information from the token payload
    const email = payload.preferred_username || (payload as Record<string, unknown>).email as string || "";
    const rawRole = payload.roles?.[0] || (payload as Record<string, unknown>).role as string;
    const name = payload.name || "";

    // Insert email into Supabase if non-existent
    const { data, error } = await supabase
      .from("users")
      .upsert({ email }, { onConflict: "email" })
      .select("user_id")
      .single();

    if (error || !data) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    let userRole: Role = "Student";
    if (rawRole) {
      if (rawRole.toLowerCase().includes("admin")) userRole = "Admin";
      else if (rawRole.toLowerCase().includes("staff") || rawRole.toLowerCase().includes("department")) userRole = "Staff";
      else userRole = "Student";
    }

    // Fetch department if staff/department
    let department = ((payload as Record<string, unknown>).department as string) || "";
    if (!department && (userRole === "Staff" || (userRole as string) === "Department")) {
      const { data: template } = await supabase
        .from("clearance_templates")
        .select("clearance_departments(dept_name)")
        .eq("staff_id", data.user_id)
        .limit(1)
        .maybeSingle();

      if (template?.clearance_departments) {
        const dept = template.clearance_departments as unknown as
          | { dept_name: string }
          | { dept_name: string }[];
        department = Array.isArray(dept) ? dept[0]?.dept_name || "" : dept?.dept_name || "";
      }
    }

    // Create token
    const session_token = await createSessionToken({
      user_id: data.user_id,
      user_email: email,
      user_name: name,
      role: userRole,
      department: department || "",
    });

    // Set the session token in cookies
    const response = NextResponse.json({ success: true, role: userRole, department });

    response.cookies.set("session_token", session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error("Failed to process token:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("session_token", "", {
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
  return res;
}
