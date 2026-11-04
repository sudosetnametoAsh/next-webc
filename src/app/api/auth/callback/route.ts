import { ClientNotEnrolledError, ENROLLMENT_NOTICE_URL } from "@/lib/auth/client-enrollment";
import { NextResponse } from "next/server";

import { makeAuthCallback } from "@/composition/auth/make-auth-callback";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  // Production request URLs can contain the server's internal bind address.
  const redirectOrigin = process.env.NODE_ENV === "production"
    ? new URL(process.env.NEXT_PUBLIC_APP_URL || origin).origin
    : origin;
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/") || next.startsWith("//")) {
    // if "next" is not a relative URL, use the default
    next = "/";
  }

  if (!code) {
    return NextResponse.redirect(`${redirectOrigin}/auth-code-error`);
  }

  try {
    const authCallback = makeAuthCallback();
    const redirectPath = await authCallback.execute(code, next);

    return NextResponse.redirect(`${redirectOrigin}${redirectPath}`);
  } catch (error) {
    if (error instanceof ClientNotEnrolledError) {
      return NextResponse.redirect(new URL(ENROLLMENT_NOTICE_URL, redirectOrigin));
    }
    console.error("Auth callback failed:", error);
    return NextResponse.redirect(`${redirectOrigin}/auth-error`);
  }
}
