import { createClient } from "@/lib/supabase-config";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(); 
const secret = new TextEncoder().encode(process.env.SESSION_SECRET!); 

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("session_token")?.value; 

  if (!cookie) {
    return NextResponse.json({ error: "No token found" }, { status: 401 });
  }

  const { payload } = await jwtVerify(cookie, secret); 
  const email = payload.email; 
  const name = payload.name; 

  // --- 1. QUERY UPDATE: We fetch 'description' directly from assigned_tasks ---
  const { data: studentData, error: studentError } = await supabase
    .from("student_clearances")
    .select(`
      status,
      students!inner (
        student_id,
        users!inner ()
      ),
      clearance_templates (
        departments ( dept_name ),
        staffs ( staff_name )
      ),
      assigned_tasks (
        status,
        description,  
        clearance_tasks_preset (
          description
        )
      )
    `)
    .eq("students.users.email", email);

  if (studentError) {
    console.error(studentError);
    return NextResponse.json({ error: studentError.message }, { status: 500 });
  }

  const { data: studentBalance, error: studentBalanceError } = await supabase
    .from("student_balances")
    .select(`
        amount,
        students!inner (
          users!inner ()
        )
    `)
    .eq("students.users.email", email);
  
  if (studentBalanceError) {
    return NextResponse.json({ error: studentBalanceError.message }, { status: 500 });
  }

  // Extract ID safely
  const firstRecord = studentData?.[0] as any;
  const studentId = firstRecord?.students?.student_id || "N/A";

  // --- 2. LOGIC UPDATE: Check for custom description first ---
  const formattedData = studentData?.map((c: any) => ({
    status: c.status,
    clearance_templates: c.clearance_templates,
    student_tasks_status: c.assigned_tasks.map((t: any) => {
        // Logic: Try to get the manual description first. 
        // If that is empty, fall back to the preset description.
        const finalDescription = t.description || t.clearance_tasks_preset?.description || "Unnamed Task";
        
        return {
            status: t.status,
            clearance_tasks_preset: {
                description: finalDescription
            }
        };
    })
  }));

  return NextResponse.json({
    name,
    student_id: studentId, 
    data: formattedData,
    balance: studentBalance,
  });
}