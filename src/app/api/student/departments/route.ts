import { createDrizzleSupabaseClient } from "@/lib/db/create-drizzle-supabase-client";
import { clearanceRecords } from "@/lib/db/schema";
import { createClient } from "@/lib/db/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const drizzle = await createDrizzleSupabaseClient();

  const { data } = await supabase.from("clearance_records").select(`*`);

  const result = await drizzle.rls( (tx) =>
    tx.select().from(clearanceRecords)
  )

  return NextResponse.json({ supabase: data, drizzle: result });
}
