import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/db/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { user_id } = await getSession();

  const { data: courses, error } = await supabase
    .from("courses")
    .select(
      `
        course_id,
        course_name,
        course_sections(
          year,
          section_id,
          semester,
          section_number
        ),
        clearance_templates!inner()
    `,
    )
    .eq("clearance_templates.staff_id", user_id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: courses }, { status: 200 });
}
