import { createClient } from "@/lib/supabase-config"
import { NextResponse } from "next/server"

const supabase = createClient()

export async function GET() {
  const { data, error } = await supabase
    .from('departments')
    .select('dept_id, dept_name')
  
  if (error) {
    console.error('Error fetching departments:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 200})
}