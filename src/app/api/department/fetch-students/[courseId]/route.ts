import { createClient } from "@/lib/supabase-config";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  courseId: string;
};

const supabase = createClient();
const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const cookie = req.cookies.get("session_token")?.value;

  if (!cookie) {
    return NextResponse.json({ error: "No token found" }, { status: 401 });
  }

  const { courseId } = await params;
  const { payload } = await jwtVerify(cookie, secret);
  const email = payload.email;

  const { data, error } = await supabase
    .from("student_clearances")
    .select(
      `
      clearance_id,
      students!inner(
        student_name,
        student_id,
        enrollments!inner()
      ),
      clearance_templates!inner(
        staffs!inner(
          users!inner()
        )
      )      
    `
    )
    .eq("students.enrollments.section_id", courseId)
    .eq("clearance_templates.staffs.users.email", email);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}
