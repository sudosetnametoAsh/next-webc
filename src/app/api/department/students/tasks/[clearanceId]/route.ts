import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/db/supabase-server";
import { logActivity } from "@/lib/log-activity";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  clearanceId: string;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const supabase = await createClient();
  const { user_id } = await getSession();
  const { clearanceId } = await params;

  const { data: tasks, error } = await supabase
    .from("clearance_tasks")
    .select(
      `
        status,
        dropbox,
        description
      `,
    )
    .eq("clearance_id", clearanceId)
    .eq("staff_id", user_id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: tasks }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user_id } = await getSession()
  const body = await req.json();

  const { data: clearanceTasks, error: insertError } = await supabase
    .from("clearance_tasks")
    .insert(body).select(`
      assigned_task_id,
      description,
      status,
      clearance_id
    `);

  if (insertError) {
    console.error("Task Insert Error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const clearanceIds = [
    ...new Set(clearanceTasks.map((task) => task.clearance_id)),
  ];

  if (clearanceIds.length > 0) {
    const { error: updateError } = await supabase
      .from("clearance_records")
      .update({ status: "Incomplete" })
      .in("clearance_id", clearanceIds);

    if (updateError) {
      console.error("Clearance Update Error:", updateError);
      return NextResponse.json(
        { error: "Tasks created, but failed to update clearance status." },
        { status: 500 },
      );
    }
  }

  const taskCount = Array.isArray(body) ? body.length : 1;
  const staffId = Array.isArray(body) ? body[0].staff_id : body.staff_id;
  const taskTitle = Array.isArray(body) ? body[0].title : body.title;

  await logActivity(
    user_id,
    "Assign Task",
    `Assigned "${taskTitle}" to ${clearanceIds.length} student(s).`,
  );

  return NextResponse.json({ data: clearanceTasks });
}
