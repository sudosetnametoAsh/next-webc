import { adminReadClient } from '@/lib/services/admin-read-client'
import { createClient } from '@/lib/db/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { invalidateServerAdminCache } from '@/lib/services/admin-cache'
import { invalidateServerDepartmentCache } from '@/lib/services/department-cache'


export async function GET() {

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('courses')
    .select(`
      course_id,
      course_name,
      course_sections (
        section_id,
        section_number,
        year,
        semester
      )
    `)
    .order('course_name', { ascending: true})

  if (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 200})
}

export async function POST(req: NextRequest) {

  const supabase = await adminReadClient()
  if (!supabase) return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })

  try {
    const { course_name, sections } = await req.json()
    if (!course_name || typeof course_name !== 'string' || course_name.trim() === '' || course_name.trim().length > 100) {
      return NextResponse.json({ error: 'Course name is required' }, { status: 400 }) 
    }

    if (sections !== undefined) {
      if (!Array.isArray(sections) || sections.length > 1000 || sections.some(section => !section ||
        !Number.isInteger(section.year) || section.year < 1 || section.year > 10 ||
        !Number.isInteger(section.semester) || section.semester < 1 || section.semester > 4 ||
        !Number.isInteger(section.section_number) || section.section_number < 1 || section.section_number > 999)) {
        return NextResponse.json({ error: 'Invalid section configuration' }, { status: 400 })
      }
      const keys = sections.map(section => `${section.year}:${section.semester}:${section.section_number}`)
      if (new Set(keys).size !== keys.length) return NextResponse.json({ error: 'Duplicate sections are not allowed' }, { status: 400 })
      // A single transaction prevents a partially created course if section creation fails.
      const [{ db }, { courses, courseSections }] = await Promise.all([import('@/lib/db'), import('@/lib/db/schema')])
      const data = await db.transaction(async transaction => {
        const [course] = await transaction.insert(courses).values({ courseName: course_name.trim() }).returning()
        if (sections.length) await transaction.insert(courseSections).values(sections.map(section => ({
          courseId: course.courseId, year: section.year, semester: section.semester, sectionNumber: section.section_number,
        })))
        return { course_id: course.courseId, course_name: course.courseName }
      })
      invalidateServerAdminCache()
      invalidateServerDepartmentCache()
      return NextResponse.json({ data }, { status: 201 })
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({ course_name: course_name.trim() })
      .select()
      .single()

    if (error) {
      console.error('Error creating course:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    invalidateServerAdminCache()
    invalidateServerDepartmentCache()

    return NextResponse.json({ data }, { status: 201 })

  } catch (err) {
    console.error('Create course error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {

  const supabase = await adminReadClient()
  if (!supabase) return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })

  try {
    const { course_id, course_name } = await req.json()

    if (!Number.isSafeInteger(course_id) || course_id <= 0 || typeof course_name !== 'string' || !course_name.trim()) {
      return NextResponse.json({ error: 'Course ID and name are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('courses')
      .update({ course_name: course_name.trim() })
      .eq('course_id', course_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating course:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    invalidateServerAdminCache()
    invalidateServerDepartmentCache()

    return NextResponse.json({ data }, { status: 200 })

  } catch (error) {
    console.error('Update course error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {

  const supabase = await adminReadClient()
  if (!supabase) return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })

  try {
    const { course_id } = await req.json()

    if (!Number.isSafeInteger(course_id) || course_id <= 0) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    // Do not cascade course removal into sections, enrollments, or templates.
    const [sections, templates] = await Promise.all([
      supabase.from('course_sections').select('section_id').eq('course_id', course_id).limit(1),
      supabase.from('clearance_templates').select('template_id').eq('course_id', course_id).limit(1),
    ])
    if (sections.error || templates.error) return NextResponse.json({ error: 'Unable to check course associations' }, { status: 500 })
    if (sections.data?.length || templates.data?.length) return NextResponse.json({ error: 'This course has sections or clearance templates. Resolve those associations before removing it.' }, { status: 409 })

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('course_id', course_id)
    
    if (error) {
      console.error('Error deleting course:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    invalidateServerAdminCache()
    invalidateServerDepartmentCache()

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    console.error('Delete course error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
