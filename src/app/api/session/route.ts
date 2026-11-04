import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { hasClientProfile, requiresClientEnrollment } from "@/lib/auth/client-enrollment";
import { RoleRouter } from "@/modules/auth/domain/role-router";

declare module "jose" {
  interface JWTPayload {
    roles?: string[];
    preferred_username?: string;
    name: string;
  }
}

const tenantId = process.env.AZURE_AD_TENANT_ID!;
const clientId = process.env.AZURE_AD_CLIENT_ID!;


const jwks = createRemoteJWKSet(
  new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`),
);

const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);

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
    const email = payload.preferred_username;
    const roles = RoleRouter.parseRoles(payload.roles);
    const role = roles[0];
    if (!email || !role) return NextResponse.json({ error: "Invalid account" }, { status: 403 });
    const name = payload.name;

    // Signing in must never enroll a client or recreate a deleted identity.
    const { data, error } = await getSupabaseAdmin()
      .from("users")
      .select("user_id, students(student_id), staffs(staff_id)")
      .ilike("email", email.replace(/[\\%_]/g, "\\$&"))
      .maybeSingle();
    if (error) return NextResponse.json({ error: "Unable to verify enrollment" }, { status: 503 });
    if (requiresClientEnrollment(roles) && !hasClientProfile(data)) {
      return NextResponse.json({ code: "NOT_ENROLLED", error: "Please contact the administrator to enroll your account." }, { status: 403 });
    }

    // Create token
    // Mint email, role, and name into token
    const session_token = await new SignJWT({
      email,
      role: role,
      name,
      id: data?.user_id || payload.sub,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(SESSION_SECRET);

    // Set the session token in cookies
    const response = NextResponse.json({ success: true, role: roles });

    response.cookies.set("session_token", session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60,
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
  });
  return res;
}
