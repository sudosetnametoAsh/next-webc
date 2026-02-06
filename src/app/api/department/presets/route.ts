import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase-config';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient();
export async function GET() {
   const payload = await getSession();

   const { data: preset, error } = await supabase
      .from('clearance_tasks_preset')
      .select(
         `
            task_id,
            description
        `,
      )
      .eq('staff_id', payload.id);

   if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
   }

   return NextResponse.json({ data: preset, id: payload.id }, { status: 200 });
}

export async function POST(req: NextRequest) {
   const payload = await getSession();

   const { description } = await req.json();

   const { data: preset, error } = await supabase
      .from('clearance_tasks_preset')
      .insert({ description: description, staff_id: payload.id })
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
      .from('clearance_tasks_preset')
      .delete()
      .eq('task_id', task_id)
      .select();

   if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
   }

   return NextResponse.json({ preset }, { status: 200 });
}

export async function PATCH(req: NextRequest) {
   const { updatedDescription, task_id } = await req.json();

   const { data: preset, error } = await supabase
      .from('clearance_tasks_preset')
      .update({ description: updatedDescription })
      .eq('task_id', task_id)
      .select();

   if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
   }

   return NextResponse.json({ preset }, { status: 200 });
}
