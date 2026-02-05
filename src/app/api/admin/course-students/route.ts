import { createClient } from '@/lib/supabase-config'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  
  // 1. Get the courseId from the URL (e.g., ?courseId=123)
  const { searchParams } = new URL(request.url)
  const courseId = searchParams.get('courseId')

  if (!courseId) {
    return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
  }

  // 2. Efficiently fetch students linked to this course
  // We join 'enrollments' -> 'course_sections' -> 'students'
  // using '!inner' on course_sections forces Supabase to only return 
  // enrollments that match our specific course_id.
  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      student:students (
        student_id,
        student_name
      ),
      section:course_sections!inner (
        section_number,
        year,
        semester,
        course_id
      )
    `)
    .eq('course_sections.course_id', courseId)
    .order('student_id', { foreignTable: 'students', ascending: true }) // Alphabetical sort usually better, but ID is faster

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 3. Flatten the nested JSON for easier use in the UI
  const students = data.map((row: any) => ({
    id: row.student?.student_id,
    name: row.student?.student_name,
    // Combine Year & Section (e.g., "4-A")
    section: `${row.section?.year}-${row.section?.section_number}`, 
    semester: row.section?.semester
  }))

  return NextResponse.json({ data: students }, { status: 200 })
}