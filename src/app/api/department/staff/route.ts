import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/db/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { user_id } = await getSession();

  // 1. Get the staff's templates where course_id is NULL (staff clearance templates)
  const { data: templates, error: templateError } = await supabase
    .from("clearance_templates")
    .select("template_id")
    .is("course_id", null)
    .eq("staff_id", user_id);

  if (templateError || !templates || templates.length === 0) {
    console.warn("No staff clearance templates found for staff:", user_id);
    return NextResponse.json({ data: [] }, { status: 200 });
  }

  const templateIds = templates.map((t) => t.template_id);

  // 2. Fetch staff members (from staffs table) who have clearance records for these templates
  // Note: clearance_records.user_id references users.user_id, which staffs.staff_id also references.
  const { data: staffsData, error: queryError } = await supabase
    .from("staffs")
    .select(
      `
      staff_id,
      staff_name,
      users!inner(
        clearance_records!inner(
          clearance_id,
          status,
          clearance_tasks(description, assigned_task_id, dropbox, status, assigned_at, title)
        )
      )
    `,
    )
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

  interface StaffData {
    staff_id: string;
    staff_name: string;
    users: UserData | UserData[];
  }

  // 3. Flatten the structure to match the frontend 'Students' type (backward compatibility)
  // We'll reuse the 'Students' type but it represents any clearance holder here.
  const staffs = staffsData?.map((s: StaffData) => {
    const userData = Array.isArray(s.users) ? s.users[0] : s.users;
    return {
      student_id: s.staff_id, // map staff_id to student_id for frontend compatibility
      student_name: s.staff_name,
      clearance_records: userData?.clearance_records || [],
    };
  });

  return NextResponse.json(
    { data: staffs },
    { status: 200 },
  );
}
