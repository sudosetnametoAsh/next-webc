import { createClient } from "@/lib/supabase-config";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  courseId: string;
};
const supabase = createClient();
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { courseId } = await params;

  const { data: students, error } = await supabase
    .from("students")
    .select(
      `
      student_id,
      student_name,
      enrollments!inner(),
      student_clearances!inner(
        clearance_id
      )
    `
    )
    .eq("enrollments.section_id", courseId);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: students }, { status: 200 });
}
