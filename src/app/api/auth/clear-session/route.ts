import { makeGetLogOutUrl } from "@/composition/auth/make-get-log-out-url";
import { NextResponse } from "next/server";

export async function GET() {
  const get_log_out_url = makeGetLogOutUrl();
  const log_out_url = await get_log_out_url.execute();

  const response = NextResponse.redirect(log_out_url);

  // Clear session_token cookie on logout
  response.cookies.delete("session_token");
  response.cookies.set("session_token", "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
