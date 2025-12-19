import { createClient } from "@/lib/supabase-config";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(); // SUpabase init
const secret = new TextEncoder().encode(process.env.SESSION_SECRET!); // Signature

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("session_token")?.value; // Get cookie

  // Check if cookie present
  if (!cookie) {
    return NextResponse.json({ error: "No token found" }, { status: 401 });
  }

  const { payload } = await jwtVerify(cookie, secret); // Verify token and extract payload
  const email = payload.email; // Extract email from payload

  // Fetch courses, students, and task preset
  const { data, error } = await supabase
    .from("courses")
    .select(
      `
        course_id,
        course_name,
        clearance_templates!inner(
          staffs!inner(
            users!inner()
          )
        )
      `
    )
    .eq("clearance_templates.staffs.users.email", email);
  
  // Error handler
  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Response data
  return NextResponse.json({ data }, { status: 200 });
}
