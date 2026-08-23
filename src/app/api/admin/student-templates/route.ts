import { createClient } from '@/lib/db/supabase-server'
import { NextResponse } from 'next/server'


// GET: Fetch student templates & statuses
export async function GET() {
  
  const supabase = await createClient()

  try {
    // Fetch all users who are students with their enrollments and clearance records
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        user_id,
        students!inner (
          student_name,
          enrollments!inner (
            course_sections (
              year,
              courses (
                course_name
              )
            )
          )
        ),
        clearance_records (
          status,
          clearance_templates (
            clearance_departments ( 
              dept_id,
              dept_name
            )
          )
        )
      `)

    if (usersError) {
      throw usersError
    }

    const activeStudents = users.filter((user: any) => user.clearance_records && user.clearance_records.length > 0)

    const studentTemplates = activeStudents.map((user: any) => {
      // Identify status (incomplete, pending, signed)
      const overallStatus = user.clearance_records.every((sC: any) => sC.status === 'Signed') ? 'Signed'
          : user.clearance_records.every((sC: any) => sC.status === 'Pending') ? 'Pending' : 'Incomplete'

      // Get pending departments
      const pendingDepts = []
      for (const clearance of user.clearance_records) {
        if (clearance.status !== 'Signed') { 
          pendingDepts.push(clearance.clearance_templates.clearance_departments) 
        }
      }

      // Extract course details from nested students -> enrollments join
      const student = user.students
      const enrollment = Array.isArray(student?.enrollments) ? student.enrollments[0] : student?.enrollments
      const course_section = enrollment?.course_sections
      const course_name = course_section?.courses?.course_name
      const course_year = course_section?.year

      return {
        student_id: user.user_id,
        student_name: student?.student_name,
        course_name,
        course_year,
        overallStatus,
        pending_departments: pendingDepts
      }
    })

    return NextResponse.json({ data: studentTemplates }, { status: 200 })

  } catch (error) {
    console.error('Fetch student templates error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 

