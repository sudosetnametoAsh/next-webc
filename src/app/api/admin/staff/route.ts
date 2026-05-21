import { createClient } from '@/lib/db/supabase-server'
import { NextResponse } from 'next/server'


export async function GET() {

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('staffs')
    .select('staff_id, staff_name')
    .order('staff_name', { ascending: true})
  
  if (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 200})
}