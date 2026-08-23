import { db } from '@/lib/db'
import { 
  students, 
  enrollments, 
  courseSections, 
  courses, 
  clearanceRecords, 
  clearanceTemplates, 
  clearanceDepartments 
} from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

// GET: Fetch student templates & statuses
export async function GET() {
  try {
    const rawRows = await db
      .select({
        student_id: students.studentId,
        student_name: students.studentName,
        course_name: courses.courseName,
        course_year: courseSections.year,
        clearance_id: clearanceRecords.clearanceId,
        status: clearanceRecords.status,
        dept_id: clearanceDepartments.deptId,
        dept_name: clearanceDepartments.deptName,
        signing_order: clearanceDepartments.signingOrder,
      })
      .from(students)
      .leftJoin(enrollments, eq(students.studentId, enrollments.studentId))
      .leftJoin(courseSections, eq(enrollments.sectionId, courseSections.sectionId))
      .leftJoin(courses, eq(courseSections.courseId, courses.courseId))
      .leftJoin(clearanceRecords, eq(students.studentId, clearanceRecords.userId))
      .leftJoin(clearanceTemplates, eq(clearanceRecords.templateId, clearanceTemplates.templateId))
      .leftJoin(clearanceDepartments, eq(clearanceTemplates.deptId, clearanceDepartments.deptId))

    // Group flat joined rows by student_id
    const studentMap = new Map<string, {
      student_id: string;
      student_name: string;
      course_name: string;
      course_year: number | null;
      clearances: Array<{
        clearance_id: number;
        status: string;
        dept_id: number | null;
        dept_name: string | null;
        signing_order: number | null;
      }>;
    }>()

    for (const row of rawRows) {
      if (!studentMap.has(row.student_id)) {
        studentMap.set(row.student_id, {
          student_id: row.student_id,
          student_name: row.student_name || 'Unknown Student',
          course_name: row.course_name || 'General',
          course_year: row.course_year,
          clearances: [],
        })
      }

      if (row.clearance_id) {
        studentMap.get(row.student_id)!.clearances.push({
          clearance_id: row.clearance_id,
          status: row.status || 'Pending',
          dept_id: row.dept_id,
          dept_name: row.dept_name,
          signing_order: row.signing_order,
        })
      }
    }

    // Filter students who have active clearance records
    const activeStudents = Array.from(studentMap.values()).filter(s => s.clearances.length > 0)

    const studentTemplates = activeStudents.map((user) => {
      const clearances = user.clearances

      // Identify status (incomplete, pending, signed)
      const overallStatus = clearances.every((sC) => sC.status === 'Signed')
        ? 'Signed'
        : clearances.every((sC) => sC.status === 'Pending')
        ? 'Pending'
        : 'Incomplete'

      // Get pending departments
      const pendingDepts = clearances
        .filter((clearance) => clearance.status !== 'Signed')
        .map((clearance) => ({
          dept_id: clearance.dept_id,
          dept_name: clearance.dept_name,
          signing_order: clearance.signing_order,
        }))

      return {
        student_id: user.student_id,
        student_name: user.student_name,
        course_name: user.course_name,
        course_year: user.course_year,
        overallStatus,
        pending_departments: pendingDepts,
      }
    })

    return NextResponse.json({ data: studentTemplates }, { status: 200 })

  } catch (error: any) {
    console.error('Fetch student templates error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
 

