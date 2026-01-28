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

  return NextResponse.json({
    user_data: {
      name: name,
      email: email,
      id: id,
    },
    data: studentData,
  });
}