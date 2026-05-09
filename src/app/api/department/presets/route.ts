import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/db/supabase-client";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient();

export async function GET() {
  const { user_id } = await getSession();

  const { data: preset, error } = await supabase
    .from("clearance_tasks_preset")
    .select(
      `
        task_id,
        title,
        description
      `,
    )
    .eq("staff_id", user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: preset, id: user_id }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const { user_id } = await getSession();

  const { title, description } = await req.json();

  const { data: preset, error } = await supabase
    .from("clearance_tasks_preset")
    .insert({
      title: title,
      description: description,
      staff_id: user_id
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preset }, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const { task_id } = await req.json();
  const { data: preset, error } = await supabase
    .from("clearance_tasks_preset")
    .delete()
    .eq("task_id", task_id)
    .select();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preset }, { status: 200 });
}

export async function PATCH(req: NextRequest) {
  const { updatedTitle, updatedDescription, task_id } = await req.json();

  const { data: preset, error } = await supabase
    .from("clearance_tasks_preset")
    .update({
      title: updatedTitle,
      description: updatedDescription
    })
    .eq("task_id", task_id)
    .select();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preset }, { status: 200 });
}
