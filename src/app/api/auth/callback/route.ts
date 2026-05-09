import { NextResponse } from "next/server";

import { makeAuthCallback } from "@/composition/auth/make-auth-callback";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) {
    // if "next" is not a relative URL, use the default
    next = "/";
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth-code-error`);
  }

  try {
    const authCallback = makeAuthCallback();
    const redirectPath = await authCallback.execute(code, next);

    const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
    const isLocalEnv = process.env.NODE_ENV === "development";

    if (isLocalEnv) {
      // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
      return NextResponse.redirect(`${origin}${redirectPath}`);
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`);
    } else {
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  } catch (error) {
    console.error(error)
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }
}
