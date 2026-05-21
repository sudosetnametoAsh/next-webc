import { createClient } from '@/lib/db/supabase-server'
import { NextRequest, NextResponse } from 'next/server'


// --- GET: Fetch Course Templates & Stats ---
export async function GET() {

  const supabase = await createClient()

  try {
    // 1. Get all courses
    const { data, error: coursesError } = await supabase
      .from('courses')
      .select(`
        course_id, 
        course_name,
        clearance_templates (
          template_id,
          dept_id,
          clearance_departments ( dept_name ),
          staffs ( staff_name )
        )
      `)
      .order('course_name')
    
    if (coursesError) throw coursesError

    const courses = data.filter(d => d.clearance_templates.length > 0)

    // 2. Calculate stats
    const courseTemplates = await Promise.all(
      (courses || []).map(async (course: any) => {
        // A. Get Sections
        const { data: sections } = await supabase
           .from('course_sections')
           .select('section_id')
           .eq('course_id', course.course_id)
        
        const sectionIds = sections?.map(s => s.section_id) || []

        // B. Get Enrollment Count
        let studentsEnrolled = 0
        if (sectionIds.length > 0) {
            const { count } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .in('section_id', sectionIds)
            studentsEnrolled = count || 0
        }

        // C. Completion Rate Logic
        const templateIds = course.clearance_templates?.map((t: any) => t.template_id) || []
        let completionRate = 0

        if (templateIds.length > 0 && studentsEnrolled > 0) {
          const { data: clearances } = await supabase
            .from('student_clearances')
            .select('student_id, status')
            .in('template_id', templateIds)
          
          if (clearances && clearances.length > 0) {
            const studentStatusMap = new Map<string, string[]>()
            clearances.forEach((c: any) => {
                const list = studentStatusMap.get(c.student_id) || []
                list.push(c.status)
                studentStatusMap.set(c.student_id, list)
            })
            let fullyClearedCount = 0
            for (const [, statuses] of studentStatusMap) {
               if (statuses.length === templateIds.length && statuses.every(s => s === 'Signed')) {
                   fullyClearedCount++
               }
            }
            completionRate = Math.round((fullyClearedCount / studentsEnrolled) * 100)
          }
        }

        return {
          course_id: course.course_id,
          course_name: course.course_name,
          completion_rate: completionRate,
          students_enrolled: studentsEnrolled,
          departments: course.clearance_templates?.map((t: any) => ({
            dept_id: t.dept_id,
            dept_name: t.clearance_departments?.dept_name || 'Unknown',
            staff_name: t.staffs?.staff_name || null
          })) || [],
          updated_at: new Date().toISOString()
        }
      })
    )

    return NextResponse.json({ data: courseTemplates }, { status: 200 })

  } catch (error: any) {
    console.error('GET Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create templates
export async function POST(req: NextRequest) {

  const supabase = await createClient()

  try {
    const { courses, assignments } = await req.json()

    if (!Array.isArray(courses) || courses.length === 0) {
      return NextResponse.json({ error: 'At least one course is required' }, { status: 400 })
    }

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ error: 'At least one department is required' }, { status: 400 })
    }

    // Validate all assignments have staff
    const missingStaff = assignments.filter(a => !a.staff_id)
    if (missingStaff.length > 0) {
      return NextResponse.json({ error: 'All departments must have assigned staff' }, { status: 400 })
    }

    // Create templates for each course with departments
    const templatesToInsert = courses.flatMap((courseId) => (
      assignments.map((a) => ({
        course_id: courseId,
        dept_id: a.dept_id,
        staff_id: a.staff_id,
      }))
    ))

    const { data, error } = await supabase
      .from('clearance_templates')
      .upsert(templatesToInsert, {
        onConflict: 'course_id, dept_id',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('Error creating templates', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, message: `Successfully created ${data.length} clearance templates` }, { status: 201 })

  } catch (error) {
    console.error('Create templates error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Remove templates per course per department
// export async function DELETE(req: NextRequest) {
//   try {
//     const { template_id } = await req.json()
  
//     if (!template_id) {
//       return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
//     }
  
//     const { error } = await supabase
//       .from('clearance_templates')
//       .delete()
//       .eq('template_id', template_id)
  
//     if (error) {
//       return NextResponse.json({ error: 'Error deleting a template' }, { status: 500 })
//     }
  
//     return NextResponse.json({ success: true }, { status: 200 })

  // } catch (error) {
  //   console.error('Delete template error', error)
  //   return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  // }
// }

// DELETE: Remove templates based on course
export async function DELETE(req: NextRequest) {

  const supabase = await createClient()

  try {
    const { course_id } = await req.json()

    if (!course_id) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('clearance_templates')
      .delete()
      .eq('course_id', course_id)
    
    if (error) {
      return NextResponse.json({ error: 'Error deleting a template' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    console.error('Delete template error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
