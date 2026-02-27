import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/supabase-config";
import { NextResponse } from "next/server";

const supabase = createClient(); // Supabase initialization

export async function GET() {
  const payload = await getSession();

  const email = payload.email; // Extract email from payload
  const name = payload.name; // Extract name from payload
  const id = payload.id;

  // Fetch clearance status and tasks
  const { data: studentData, error: studentError } = await supabase
    .from("student_clearances")
    .select(
      `
        clearance_id,
        status,
        clearance_templates (
          departments ( dept_name ),
          staffs ( staff_name )
        ),
        assigned_tasks (
          assigned_task_id,
          status,
          dropbox,
          description,
          uploaded_at
        ),
        students!inner (
          users!inner ()
        )
      `,
    )
    .eq("students.users.email", email);

  // Error handler
  if (studentError) {
    console.error(studentError);
    return NextResponse.json({ error: studentError.message }, { status: 500 });
  }

  // Fetch student balance
  const { data: studentBalance, error: studentBalanceError } = await supabase
    .from("student_balances")
    .select(
      `
        amount,
        students!inner (
          users!inner ()
        )
      `,
    )
    .eq("students.users.email", email);

  // Error handler
  if (studentBalanceError) {
    console.error(studentBalanceError);
    return NextResponse.json(
      { error: studentBalanceError.message },
      { status: 500 },
    );
  }

  // Response data
  return NextResponse.json({
    user_data: {
      name: name,
      email: email,
      id: id,
      balance: studentBalance,
    },
    data: studentData,
  });
}
