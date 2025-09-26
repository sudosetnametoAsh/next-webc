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

  const { data, error } = await supabase
  .from("studentclearances")
  .select(`
    status,
    students!inner (
      student_name,
      users!inner (
        email
      )
    ),
    clearancetemplates (
      departments ( dept_name ),
      staffs ( staff_name )
    )
  `)
  .eq("students.users.email", email);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    name,
    data,
  });

}
