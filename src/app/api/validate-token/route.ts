import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import { supabase } from "@/lib/supabase-config";

const tenantId = process.env.AZURE_AD_TENANT_ID!;
const clientId = process.env.AZURE_AD_CLIENT_ID!;

const jwks = createRemoteJWKSet(
  new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`)
);

const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing access token" },
        { status: 400 }
      );
    }

    const { payload } = await jwtVerify(accessToken, jwks, {
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      audience: clientId,
    });

    const email = payload.preferred_username as string;
    const role = payload.roles || [];
    const name = payload.name;

    const { error } = await supabase
      .from("users")
      .upsert({ email }, { onConflict: "email" })
      .select()
      .single();

    if (error) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const sessionToken = await new SignJWT({ email, role, name })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(SESSION_SECRET);

    const res = NextResponse.json({ success: true });
    res.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60,
    });

    return res;
  } catch (err) {
    console.error("Failed to process token:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("session_token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Missing session token" },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, SESSION_SECRET);

    return NextResponse.json({
      email: payload.email,
      role: payload.role,
      message: "Session is valid",
    });
  } catch (err) {
    console.error("Session validation failed:", err);
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
}
