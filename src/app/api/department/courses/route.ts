import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/supabase-config";
import { NextResponse } from "next/server";

const supabase = createClient();
export async function GET() {
  const payload = await getSession();

  const { data: courses, error } = await supabase
    .from("courses")
    .select(`
        course_id,
        course_name,
        course_sections(
          year,
          section_id,
          semester,
          section_number
        ),
        clearance_templates!inner()
    `)
    .eq("clearance_templates.staff_id", payload.id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: courses }, { status: 200 });
}
