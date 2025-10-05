import { supabase } from "@/lib/supabase-config";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const userHeader = req.headers.get("x-user");

  if (!userHeader) {
    return NextResponse.json({ error: "No user found" }, { status: 401 });
  }

  const user = JSON.parse(userHeader);
  const name = user.name;
  const email = user.email;

  const { data: studentData, error: studentError } = await supabase
    .from("student_clearances")
    .select(
      `
    status,
    students!inner (
      users!inner ()
    ),
    clearance_templates (
      departments ( dept_name ),
      staffs ( staff_name )
    ),
    requirements_status (
      status,
      clearance_requirements ( description )
    )
  `
    )
    .eq("students.users.email", email);

  if (studentError) {
    console.error(studentError);
    return NextResponse.json({ error: studentError.message }, { status: 500 });
  }

  const { data: studentBalance, error: studentBalanceError } = await supabase
    .from("student_balances")
    .select(
      `
        amount,
        students!inner (
          users!inner ()
        )
      `
    )
    .eq("students.users.email", email);

  if (studentBalanceError) {
    console.error(studentBalanceError);
    return NextResponse.json(
      { error: studentBalanceError.message },
      { status: 500 }
    );
  }
  return NextResponse.json({
    name,
    data: studentData,
    balance: studentBalance,
  });
}
