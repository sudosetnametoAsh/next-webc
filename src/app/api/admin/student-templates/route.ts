import { createClient } from '@/lib/supabase-config'
import { NextResponse } from 'next/server'


// GET: Fetch student templates & statuses
export async function GET() {
  const supabase = createClient()

  try {
    // Get all enrolled students
    const { data: enrolledStudents, error: enrolledStudentsError } = await supabase
      .from('enrollments')
      .select('student_id')
    
    if (enrolledStudentsError) { throw enrolledStudentsError }

    const enrolledStudentIds = enrolledStudents?.map(eS => eS.student_id) || []
    
    const { data, error: studentsError } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        student_clearances (
          status,
          clearance_templates (
            departments ( 
              dept_id,
              dept_name
            )
          )
        )
      `)
      .in('student_id', enrolledStudentIds)

    if (studentsError) { throw studentsError }

    const students = data.filter(student => student.student_clearances. length > 0)
    const nonClearedStudents = students.filter(student => student.student_clearances.some(sC => sC.status !== 'Signed'))

    const studentTemplates = await Promise.all(
      (nonClearedStudents).map(async (student: any) => {
        
        // Identify status (incomplete, pending)
        const overallStatus = student.student_clearances.every((sC: any) => sC.status === 'Pending') ? 'Pending' : 'Incomplete'

        // Get pending departments
        const pendingDepts = []
        for (const clearance of student.student_clearances) {
          
          if (clearance.status !== 'Signed') { 
            pendingDepts.push(clearance.clearance_templates.departments) 
          }
        }

        // Get course name & year
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('student_id, course_sections ( year, courses ( course_name ))')
          .in('student_id', nonClearedStudents.map(s => s.student_id))
        
        const enrollmentMap = new Map(enrollments?.map(e => [e.student_id, e])) 

        const course_section = enrollmentMap.get(student.student_id)?.course_sections
        const course_name = course_section?.courses?.course_name
        const course_year = course_section?.year

        return {
          student_id: student.student_id,
          student_name: student.student_name,
          course_name,
          course_year,
          overallStatus,
          pending_departments: pendingDepts
        }
      })
    )

    return NextResponse.json({ data: studentTemplates }, { status: 200 })

  } catch (error) {
    console.error('Fetch student templates error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 