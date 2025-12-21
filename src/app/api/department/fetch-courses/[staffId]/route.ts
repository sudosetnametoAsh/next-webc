import { createClient } from "@/lib/supabase-config";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(); // SUpabase init

type Params = {
  staffId: string;
};
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const cookie = req.cookies.get("session_token")?.value; // Get cookie

  // Check if cookie present
  if (!cookie) {
    return NextResponse.json({ error: "No token found" }, { status: 401 });
  }

  const { staffId } = await params;

  // Fetch courses
  const { data, error } = await supabase
    .from("courses")
    .select(
      `
        course_id,
        course_name,
        clearance_templates!inner(
          staffs!inner()
        )
      `
    )
    // .eq("clearance_templates.staffs.users.email", email);
    .eq("clearance_templates.staffs.staff_id", staffId)

  // Error handler
  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Response data
  return NextResponse.json({ data }, { status: 200 });
}
