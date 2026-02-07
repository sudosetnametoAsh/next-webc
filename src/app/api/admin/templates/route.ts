import { createClient } from '@/lib/supabase-config'
import { NextResponse } from 'next/server'

const supabase = createClient()

export async function GET() {
  try {
    // Get all courses with their templates and related data
    const { data: courses, error: coursesError } = await supabase
      .from('courses').
      select(`
        course_id, 
        course_name,
        clearance_templates (
          template_id,
          dept_id,
          departments (
            dept_id,
            dept_name
          ),
          staffs (
            staff_name
          )
        )
      `)
      .order('course_name')
    
    if (coursesError) {
      console.error('Error fetching courses:', coursesError)
      return NextResponse.json({ error: coursesError.message }, { status: 500 })
    }

    // For each course, calculate enrollment and completion stats
    const courseTemplates = await Promise.all(
      (courses ?? []).map(async (course) => {
        // Get total students enrolled in the course
        const { count: studentsEnrolled } = await supabase
          .from('enrollments')
          .select('student_id', { count: 'exact', head: true } )
          .in(
            'section_id', 
            (
              await supabase
                .from('course_sections')
                .select('section_id')
                .eq('course_id', course.course_id)
            ).data?.map(section => section.section_id) ?? []
          )
        
        // Get completion rate (students will clearances signed for this course)
        const templateIds = course.clearance_templates.map(t => t.template_id) ?? []

        let completionRate = 0
        if (templateIds.length > 0 && (studentsEnrolled ?? 0) > 0 ) {
          // Get clearances data for these templates
          const { data: clearances } = await supabase
            .from('student_clearances')
            .select('student_id, status')
            .in('template_id', templateIds)

            
          if (clearances && clearances.length > 0) {
            // Group by student
            const studentClearances = new Map<string, string[]>()
            for (const clearance of clearances) {
              const existing = studentClearances.get(clearance.student_id) ?? []
              existing.push(clearance.status)
              studentClearances.set(clearance.student_id, existing)
            }

            // Count how many students have all clearances signed
            let signedCount = 0
            for (const [, statuses] of studentClearances) {
              if (statuses.length === templateIds.length && statuses.every(status => status === 'Signed')) {
                signedCount++
              }

              completionRate = Math.round((signedCount / (studentsEnrolled ?? 1)) * 100)
            }
          }
        }

        // Format departments with staff info
        const departments = course.clearance_templates.map(template => ({
          dept_id: template.dept_id,
          dept_name: template.departments?.dept_name ?? 'Unknown',
          staff_name: template.staffs?.staff_name ?? null,
        })) ?? []

        return {
          course_id: course.course_id,
          course_name: course.course_name,
          completion_rate: completionRate,
          students_enrolled: studentsEnrolled ?? 0,
          departments: departments,
          updated_at: null, // add later when we have a timestamp for template updates
        }
      })
    )

    return NextResponse.json({ data: courseTemplates }, { status: 200 })

  } catch (error) {
    console.error('Error fetching templates per course:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}