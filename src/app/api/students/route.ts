import { createClient } from "@/lib/supabase-config";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(); // Supabase initialization
const secret = new TextEncoder().encode(process.env.SESSION_SECRET!); // Signature

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("session_token")?.value; // Get cookie

  // Check if cookie is present
  if (!cookie) {
    return NextResponse.json({ error: "No token found" }, { status: 401 });
  }

  
  const { payload } = await jwtVerify(cookie, secret); // Verify token and extract payload
  const email = payload.email; // Extract email from payload
  const name = payload.name // Extract name from payload

  // Fetch clearance status and tasks
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
        student_tasks_status (
          status,
          clearance_tasks_preset ( description )
        )
      `
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
      `
    )
    .eq("students.users.email", email);
  
  // Error handler
  if (studentBalanceError) {
    console.error(studentBalanceError);
    return NextResponse.json(
      { error: studentBalanceError.message },
      { status: 500 }
    );
  }

  // Response data
  return NextResponse.json({
    name,
    data: studentData,
    balance: studentBalance,
  });
}
