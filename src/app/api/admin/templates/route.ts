import { createClient } from '@/lib/supabase-config'
import { NextResponse } from 'next/server'

const supabase = createClient()

// --- GET: Fetch Course Templates & Stats ---
export async function GET() {
  try {
    // 1. Get all courses
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(`
        course_id, 
        course_name,
        clearance_templates (
          template_id,
          dept_id,
          departments ( dept_name ),
          staffs ( staff_name )
        )
      `)
      .order('course_name')
    
    if (coursesError) throw coursesError

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
            dept_name: t.departments?.dept_name || 'Unknown',
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

// --- POST: Create/Assign Templates ---
// export async function POST(req: NextRequest) {
//     try {
//         const body = await req.json()
//         const { course_id, dept_ids } = body

//         if (!course_id) return NextResponse.json({ error: 'Course ID missing' }, { status: 400 })
//         if (!dept_ids || dept_ids.length === 0) return NextResponse.json({ error: 'Departments missing' }, { status: 400 })

//         // 1. Fetch Department Names to find matching Staff
//         const { data: departments } = await supabase
//             .from('departments')
//             .select('dept_id, dept_name')
//             .in('dept_id', dept_ids)

//         // 2. Fetch All Staff
//         const { data: staffs } = await supabase
//             .from('staffs')
//             .select('staff_id, staff_name')

//         // 3. Match Dept to Staff
//         const rowsToInsert = dept_ids.map((deptId: number) => {
//             const dept = departments?.find(d => d.dept_id === deptId)
//             // We assume the Staff Name is roughly the same as Dept Name
//             const staff = staffs?.find(s => s.staff_name === dept?.dept_name)

//             return {
//                 course_id: course_id,
//                 dept_id: deptId,
//                 // Assuming 'staff_id' is required by your DB. If no match, we send NULL.
//                 // If your DB requires NOT NULL, this will error unless we find a match.
//                 staff_id: staff?.staff_id || null 
//             }
//         })

//         // 4. Insert
//         const { data, error } = await supabase
//             .from('clearance_templates')
//             .insert(rowsToInsert)
//             .select()

//         if (error) {
//             console.error('Insert Error:', error)
//             return NextResponse.json({ error: error.message }, { status: 500 })
//         }

//         return NextResponse.json({ success: true, data }, { status: 201 })

//     } catch (error: any) {
//         console.error('POST Error:', error)
//         return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//     }
// }