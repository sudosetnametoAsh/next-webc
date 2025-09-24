import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });

  res.cookies.set("session_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
  });

  return res;
}
