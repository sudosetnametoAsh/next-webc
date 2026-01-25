import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/db/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { user_email, user_id, user_name } = await getSession();

  const email = user_email;
  const name = user_name;
  const id = user_id;

  const { data: studentData, error: studentError } = await supabase
    .from("clearance_records")
    .select(
      `
        clearance_id,
        status,
        clearance_templates (
          clearance_departments ( dept_name ),
          staffs ( staff_name )
        ),
        clearance_tasks (
          assigned_task_id,
          status,
          dropbox,
          description,
          uploaded_at,
          comments,
          title
        )
      `,
    );
  // .eq("students.users.email", email);

  if (studentError) {
    console.error(studentError);
    return NextResponse.json({ error: studentError.message }, { status: 500 });
  }

  return NextResponse.json({
    user_data: {
      name: name,
      email: email,
      id: id,
    },
    data: studentData,
  });
}
