import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/supabase-config";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  clearanceId: string;
};

const supabase = createClient();
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const payload = await getSession();
  const { clearanceId } = await params;

  const { data: tasks, error } = await supabase
    .from("assigned_tasks")
    .select(
      `
        description
      `
    )
    .eq("clearance_id", clearanceId)
    .eq("staff_id", payload.id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: tasks }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { data: assigned_tasks, error } = await supabase.from("assigned_tasks").insert(body)
    .select(`
      assigned_task_id,
      description,
      status
    `);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: assigned_tasks });
}
