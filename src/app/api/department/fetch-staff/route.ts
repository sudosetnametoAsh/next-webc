import { createClient } from "@/lib/supabase-config";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient();
const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("session_token")?.value;

  if (!cookie) {
    return NextResponse.json({ error: "No token found" }, { status: 401 });
  }

  const { payload } = await jwtVerify(cookie, secret);
  const email = payload.email;

  // Fetch staff members with their clearance tasks preset
  const { data, error } = await supabase
    .from("staffs")
    .select(
      `
        staff_id,
        staff_name,
        departments(
          dept_name
        ),
        clearance_tasks_preset(
          description,
          task_id
        ),
        users!inner(
          email
        )
      `
    )
    .eq("users.email", email);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}
