import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/db/supabase-server";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  section_id: string;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const supabase = await createClient();
  const {user_id} = await getSession();
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
    .eq("staff_id", user_id)
    .single();

  const { data: students, error } = await supabase
    .from("students")
    .select(
      `
      student_id,
      student_name,
      enrollments!inner(),
      clearance_records!inner(
        clearance_id,
        status,
        clearance_tasks(description, assigned_task_id, dropbox, status, assigned_at, title)
      )
    `,
    )
    .eq("enrollments.section_id", section_id)
    .eq("clearance_records.template_id", template_id?.template_id);

  if (error) {
    console.error(error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { data: students, course_id: course_id },
    { status: 200 },
  );
}
