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
  const { user_id } = await getSession();
  const { section_id } = await params;

  // 1. Get the course associated with this section
  const { data: courseSection, error: sectionError } = await supabase
    .from("course_sections")
    .select("course_id")
    .eq("section_id", section_id)
    .single();

  if (sectionError || !courseSection) {
    console.error("Section not found:", sectionError);
    return NextResponse.json({ data: [] }, { status: 200 });
  }

  // 2. Get the staff's template for this course
  // We use .select().in() or similar if there could be multiple, 
  // but usually a staff has one template per course/dept.
  const { data: templates, error: templateError } = await supabase
    .from("clearance_templates")
    .select("template_id")
    .eq("course_id", courseSection.course_id)
    .eq("staff_id", user_id);

  if (templateError || !templates || templates.length === 0) {
    console.warn("No template found for staff:", user_id, "on course:", courseSection.course_id);
    return NextResponse.json({ data: [] }, { status: 200 });
  }

  const templateIds = templates.map(t => t.template_id);

  // 3. Fetch students with their enrollments and clearance records for the found template(s)
  const { data: studentsData, error: queryError } = await supabase
    .from("students")
    .select(
      `
      student_id,
      student_name,
      enrollments!inner(),
      users!inner(
        clearance_records!inner(
          clearance_id,
          status,
          clearance_tasks(description, assigned_task_id, dropbox, status, assigned_at, title)
        )
      )
    `,
    )
    .eq("enrollments.section_id", section_id)
    .in("users.clearance_records.template_id", templateIds);

  if (queryError) {
    console.error("Query Error:", queryError.message);
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  interface ClearanceTaskData {
    description: string;
    assigned_task_id: number;
    dropbox: string;
    status: string;
    assigned_at: string;
    title: string;
  }

  interface ClearanceRecordData {
    clearance_id: string;
    status: string;
    clearance_tasks: ClearanceTaskData[];
  }

  interface UserData {
    clearance_records: ClearanceRecordData[];
  }

  interface StudentData {
    student_id: string;
    student_name: string;
    users: UserData | UserData[];
  }

  // 4. Flatten the structure to match the frontend 'Students' type
  const students = studentsData?.map((s: StudentData) => {
    // PostgREST return for 1:1 join might be an object or single-element array depending on schema
    const userData = Array.isArray(s.users) ? s.users[0] : s.users;
    return {
      student_id: s.student_id,
      student_name: s.student_name,
      clearance_records: userData?.clearance_records || [],
    };
  });

  return NextResponse.json(
    { data: students, course_id: courseSection.course_id },
    { status: 200 },
  );
}
