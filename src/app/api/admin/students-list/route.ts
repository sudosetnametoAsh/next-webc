import { createClient } from '@/lib/supabase-config'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(30, Math.max(1, parseInt(searchParams.get('limit') || '25')))
  const courseFilter = searchParams.get('course') || ''

  try {
    // Build the enrollment query with joins
    let query = supabase
      .from('enrollments')
      .select(`
        student:students (
          student_id,
          student_name,
          student_clearances ( status )
        ),
        section:course_sections!inner (
          section_number,
          year,
          semester,
          courses!inner ( course_id, course_name )
        )
      `, { count: 'exact' })

    // Apply course filter if provided
    if (courseFilter) {
      query = query.eq('course_sections.courses.course_name', courseFilter)
    }

    // Get total count first
    const { count: totalCount, error: countError } = await query

    if (countError) {
      console.error('Error counting students:', countError)
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    const total = totalCount ?? 0
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit

    // Fetch paginated data
    let dataQuery = supabase
      .from('enrollments')
      .select(`
        student:students (
          student_id,
          student_name,
          student_clearances ( status )
        ),
        section:course_sections!inner (
          section_number,
          year,
          semester,
          courses!inner ( course_id, course_name )
        )
      `)

    if (courseFilter) {
      dataQuery = dataQuery.eq('course_sections.courses.course_name', courseFilter)
    }

    const { data, error } = await dataQuery
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching students list:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const students = (data ?? []).map((row: any) => {
      const clearances = row.student?.student_clearances ?? []
      let clearance_status: 'Cleared' | 'Incomplete' | 'Pending' = 'Pending'

      if (clearances.length > 0) {
        const allSigned = clearances.every((c: any) => c.status === 'Signed')
        const allPending = clearances.every((c: any) => c.status === 'Pending')

        if (allSigned) clearance_status = 'Cleared'
        else if (allPending) clearance_status = 'Pending'
        else clearance_status = 'Incomplete'
      }

      return {
        student_id: row.student?.student_id ?? '',
        student_name: row.student?.student_name ?? '',
        course_name: row.section?.courses?.course_name ?? '',
        section: `${row.section?.year ?? ''}-${row.section?.section_number ?? ''}`,
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
