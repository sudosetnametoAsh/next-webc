import { createDrizzleSupabaseClient } from "@/lib/db/create-drizzle-supabase-client";
import { studentClearances } from "@/lib/db/schema";
import { createClient } from "@/lib/db/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const drizzle = await createDrizzleSupabaseClient();

  const { data } = await supabase.from("student_clearances").select(`*`);

  const result = await drizzle.rls( (tx) =>
    tx.select().from(studentClearances)
  )

  return NextResponse.json({ supabase: data, drizzle: result });
}
