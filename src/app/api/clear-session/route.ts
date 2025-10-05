import { NextResponse } from "next/server";

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("session_token", "", {
    path: "/",
    expires: new Date(0),
  });
  return res;
}
