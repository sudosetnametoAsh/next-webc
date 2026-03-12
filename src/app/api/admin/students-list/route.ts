import { createClient } from '@/lib/supabase-config'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(30, Math.max(1, parseInt(searchParams.get('limit') || '25')))
  const courseFilter = searchParams.get('course') || ''
  const search = searchParams.get('search') || ''
  const offset = (page - 1) * limit

  try {
    // Single query for both count and paginated data
    let query = supabase
  .from('students')                        
  .select(`
    student_id,
    student_name,
    student_clearances ( status ),
    enrollments (
      section:course_sections!inner (
        section_number,
        year,
        semester,
        courses!inner ( course_id, course_name )
      )
    )
  `, { count: 'exact' })

    // Apply course filter if provided
    if (courseFilter) {
      query = query.eq('enrollments.course_sections.courses.course_name', courseFilter)
    }

    // Apply search filter (by student name or student id)
    if (search) {
      query = query.or(`student_name.ilike.%${search}%,student_id.ilike.%${search}%`)
    }

    const { data, count: totalCount, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching students list:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const total = totalCount ?? 0
    const totalPages = Math.ceil(total / limit)

    const students = (data ?? []).map((row: any) => {
      const clearances = row.student_clearances ?? []
      let clearance_status: 'Cleared' | 'Incomplete' | 'Pending' = 'Pending'

      if (clearances.length > 0) {
        const allSigned = clearances.every((c: any) => c.status === 'Signed')
        const hasSomeSigned = clearances.some((c: any) => c.status === 'Signed')
        if (allSigned) clearance_status = 'Cleared'
        else if (hasSomeSigned) clearance_status = 'Incomplete'
      }

      const enrollment = row.enrollments?.[0]
      const section = enrollment?.section

      return {
        student_id: row.student_id ?? '',
        student_name: row.student_name ?? '',
        course_name: section?.courses?.course_name ?? '',
        section: section ? `${section.year ?? ''}-${section.section_number ?? ''}` : '-',
        clearance_status,
      }
    })

    return NextResponse.json({
      data: {
        students,
        total,
        page,
        limit,
        totalPages,
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Error fetching students list:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
