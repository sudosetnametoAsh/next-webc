import { createClient } from "@/lib/supabase-config";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";


interface ClearanceTask {
  status: string;
  description: string | null;
  clearance_tasks_preset: {
    description: string;
  } | null;
}

interface ClearanceRecord {
  status: string;
  students: {
    student_id: string;
  };
  clearance_templates: {
    departments: { dept_name: string } | null;
    staffs: { staff_name: string } | null;
  } | null;
  assigned_tasks: ClearanceTask[];
}

interface BalanceRecord {
  amount: number;
}

const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);

export async function GET(req: NextRequest) {
  
  const supabase = createClient();

  const cookie = req.cookies.get("session_token")?.value;

  if (!cookie) {
    return NextResponse.json({ error: "No token found" }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(cookie, secret);
    const email = payload.email as string;
    const name = payload.name;

    
    const [clearanceResult, balanceResult] = await Promise.all([
      supabase
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
        .eq("students.users.email", email)
        .returns<ClearanceRecord[]>(), // Apply type

      supabase
        .from("student_balances")
        .select(`
            amount,
            students!inner (
              users!inner ()
            )
        `)
        .eq("students.users.email", email)
        .returns<BalanceRecord[]>() // Apply type
    ]);

    
    if (clearanceResult.error) throw new Error(clearanceResult.error.message);
    if (balanceResult.error) throw new Error(balanceResult.error.message);

    const studentData = clearanceResult.data || [];
    const studentBalance = balanceResult.data || [];

    
    const firstRecord = studentData[0];
    const studentId = firstRecord?.students?.student_id || "N/A";

    
    const formattedData = studentData.map((c) => ({
      status: c.status,
      clearance_templates: c.clearance_templates,
      student_tasks_status: c.assigned_tasks.map((t) => ({
        status: t.status,
        clearance_tasks_preset: {
          
          description: t.description ?? t.clearance_tasks_preset?.description ?? "Unnamed Task"
        }
      }))
    }));

    return NextResponse.json({
      name,
      student_id: studentId,
      data: formattedData,
      balance: studentBalance, 
    });

  } catch (err: any) {
    console.error("API Error:", err);
    
    return NextResponse.json(
      { error: err.message || "Internal Server Error" }, 
      { status: 500 }
    );
  }
}