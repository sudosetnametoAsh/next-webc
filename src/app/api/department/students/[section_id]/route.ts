import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/supabase-config";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  section_id: string;
};
const supabase = createClient();
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const session = await getSession();
  const { section_id } = await params;

  const { data: course_id } = await supabase
    .from("course_sections")
    .select("course_id")
    .eq("section_id", section_id)
    .single();

  const { data: template_id } = await supabase
    .from("clearance_templates")
    .select("template_id")
    .eq("course_id", course_id?.course_id)
    .eq("staff_id", session.id)
    .single();

  const { data: students, error } = await supabase
    .from("students")
    .select(
      `
      student_id,
      student_name,
      enrollments!inner(),
      student_clearances!inner(
        clearance_id,
        status
      )
    `,
    )
    .eq("enrollments.section_id", section_id)
    .eq("student_clearances.template_id", template_id?.template_id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { data: students, course_id: course_id },
    { status: 200 },
  );
}
