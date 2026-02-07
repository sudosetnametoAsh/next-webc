import { createClient } from '@/lib/supabase-config'
import { NextResponse } from 'next/server'

const supabase = createClient()

export async function GET() {
  const { data, error } = await supabase
    .from('courses')
    .select('course_id, course_name')
    .order('course_name', { ascending: true})

  if (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 200})
}