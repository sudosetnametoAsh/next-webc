import { createClient } from "@/lib/supabase-config";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  courseId: string;
};

const supabase = createClient();
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const cookie = req.cookies.get("session_token")?.value;

  if (!cookie) {
    return NextResponse.json({ error: "No token found" }, { status: 401 });
  }

  const { courseId } = await params;

  const { data, error } = await supabase
    .from("courses")
    .select(
      `
        students(
            student_id,
            student_name
        )
    `
    )
    .eq("course_id", courseId);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}
