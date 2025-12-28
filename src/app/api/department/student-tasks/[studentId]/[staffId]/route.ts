import { createClient } from "@/lib/supabase-config";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient();

type Params = {
  studentId: string;
  staffId: string;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const cookie = req.cookies.get("session_token")?.value;

  if (!cookie) {
    return NextResponse.json({ error: "No token found" }, { status: 401 });
  }

  const { studentId, staffId } = await params;

  const { data, error } = await supabase
    .from("clearance_tasks_preset")
    .select(
      `
      description,
      student_tasks_status!inner(
        student_clearances!inner()
      )
      
    `
    )
    .eq("student_tasks_status.student_clearances.student_id", studentId)
    .eq("staff_id", staffId);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

