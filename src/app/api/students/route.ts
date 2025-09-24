import { supabase } from "@/lib/supabase-config";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const userHeader = req.headers.get("x-user");

  if (!userHeader) {
    return NextResponse.json({ error: "No user found" }, { status: 401 });
  }

  const user = JSON.parse(userHeader);
  const role = user.role;
  const name = user.name;

  return NextResponse.json({
    role: role,
    name: name,
    message: "Data passed",
  });
}
