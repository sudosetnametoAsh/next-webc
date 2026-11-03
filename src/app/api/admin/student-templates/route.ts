import { createClient } from '@/lib/db/supabase-server'
import { NextResponse } from 'next/server'
import { computeClientOverdueStatus } from '@/lib/clearance-logic'

// GET: Fetch student templates & statuses
export async function GET() {
  const supabase = await createClient()

  try {
    // 1. Get all enrolled students
    const { data: enrolledStudents, error: enrolledStudentsError } = await supabase
      .from('enrollments')
      .select('student_id')
    
    if (enrolledStudentsError) throw enrolledStudentsError

    const enrolledStudentIds = enrolledStudents?.map(eS => eS.student_id) || []
    if (enrolledStudentIds.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }

    // 2. Fetch student profiles, clearance records, and enrollments in parallel
    const [studentsResult, clearancesResult, enrollmentsResult] = await Promise.all([
      supabase
        .from('students')
        .select('student_id, student_name')
        .in('student_id', enrolledStudentIds),

      // Query clearance_records directly (they reference user_id which equals student_id)
      (async () => {
        const fetchPage = (offset: number) => supabase
        .from('clearance_records')
        .select(`
          clearance_id,
          user_id,
          status,
          signed_at,
          created_at,
          clearance_templates (
            dept_id,
            tier,
            staff_id,
            is_active,
            staffs (
              staff_name
            ),
            clearance_departments ( 
              dept_id,
              dept_name,
              icon_name,
              floor,
              room
            )
          )
        `)
        .in('user_id', enrolledStudentIds)
          .order('clearance_id').range(offset, offset + 499)
        const first = await fetchPage(0)
        if (first.error) return first
        const data = [...first.data]
        let pageLength = first.data.length
        while (pageLength === 500) {
          const page = await fetchPage(data.length)
          if (page.error) return page
          data.push(...page.data)
          pageLength = page.data.length
        }
        return { ...first, data }
      })(),

      supabase
        .from('enrollments')
        .select(`
          student_id,
          course_sections (
            section_id,
            section_number,
            year,
            semester,
            courses (
              course_id,
              course_name
            )
          )
        `)
        .in('student_id', enrolledStudentIds)
    ])

    if (studentsResult.error) throw studentsResult.error
    if (clearancesResult.error) throw clearancesResult.error
    if (enrollmentsResult.error) throw enrollmentsResult.error

    // 3. Map clearance records by user_id (filtering for active templates only)
    const clearanceMap = new Map<string, any[]>()
    for (const cr of clearancesResult.data || []) {
      const template = Array.isArray(cr.clearance_templates)
        ? cr.clearance_templates[0]
        : cr.clearance_templates
      if (template?.is_active === false) continue
      const list = clearanceMap.get(cr.user_id) || []
      list.push(cr)
      clearanceMap.set(cr.user_id, list)
    }

    // 4. Map enrollments by student_id
    const enrollmentMap = new Map<string, any>()
    for (const en of enrollmentsResult.data || []) {
      enrollmentMap.set(en.student_id, en)
    }

    // 5. Build consolidated student templates list
    const studentTemplates = (studentsResult.data || []).map((student) => {
      const records = clearanceMap.get(student.student_id) || []

      // Identify status (incomplete, pending, signed)
      const overallStatus =
        records.length === 0
          ? 'Incomplete'
          : records.every((r: any) => r.status === 'Signed')
          ? 'Signed'
          : records.every((r: any) => r.status === 'Pending')
          ? 'Pending'
          : 'Incomplete'

      // Get pending departments
      const pendingDepts: any[] = []
      for (const clearance of records) {
        if (clearance.status !== 'Signed' && clearance.clearance_templates?.clearance_departments) {
          pendingDepts.push(clearance.clearance_templates.clearance_departments)
        }
      }

      // Course section info
      const enrollment = enrollmentMap.get(student.student_id)
      const section = Array.isArray(enrollment?.course_sections)
        ? enrollment?.course_sections[0]
        : enrollment?.course_sections

      const courseId = section?.courses?.course_id
      const courseName = section?.courses?.course_name
      const courseYear = section?.year
      const sectionNumber = section?.section_number
      const semester = section?.semester
      const sectionId = section?.section_id

      const totalDepts = records.length;
      const signedDepts = records.filter((r: any) => r.status === 'Signed').length;

      const departmentClearances = records.map((r: any) => ({
        clearance_id: r.clearance_id,
        dept_id: r.clearance_templates?.clearance_departments?.dept_id || r.clearance_templates?.dept_id,
        dept_name: r.clearance_templates?.clearance_departments?.dept_name || 'Department',
        icon_name: r.clearance_templates?.clearance_departments?.icon_name || null,
        floor: r.clearance_templates?.clearance_departments?.floor || null,
        room: r.clearance_templates?.clearance_departments?.room || null,
        staff_name: r.clearance_templates?.staffs?.staff_name || null,
        status: r.status,
        signed_at: r.signed_at,
        created_at: r.created_at,
        tier: r.clearance_templates?.tier ?? 1,
      }));

      const overdueInfo = computeClientOverdueStatus(departmentClearances, false);

      return {
        student_id: student.student_id,
        student_name: student.student_name,
        course_id: courseId,
        course_name: courseName,
        course_year: courseYear,
        section_number: sectionNumber,
        semester,
        section_id: sectionId,
        overallStatus,
        pending_departments: pendingDepts,
        total_departments: totalDepts,
        signed_departments: signedDepts,
        departments: departmentClearances,
        isOverdue: overdueInfo.isOverdue,
        overduePhase: overdueInfo.overduePhase,
        overduePhaseLabel: overdueInfo.overduePhaseLabel,
        dwellHours: overdueInfo.dwellHours,
      }
    })

    return NextResponse.json({ data: studentTemplates }, { status: 200 })

  } catch (error) {
    console.error('Fetch student templates error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
