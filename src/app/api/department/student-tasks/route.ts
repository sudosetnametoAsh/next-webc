import { createClient } from "@/lib/supabase-config";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient();
export async function POST(req: NextRequest) {
  const cookie = req.cookies.get("session_token")?.value;

  if (!cookie) {
    return NextResponse.json({ error: "No token found" }, { status: 401 });
  }

  const body = await req.json();
  
  const { data, error } = await supabase
  .from("assigned_tasks")
  .insert(body)
  .select(`
    assigned_task_id,
    description,
    status
  `);

  if (error) {
    console.error(error )
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data });
}
