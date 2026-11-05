import { NextRequest, NextResponse } from 'next/server'
import { adminReadClient } from '@/lib/services/admin-read-client'
import type { AcademicPeriod } from '@/lib/academic-periods/types'

export async function GET(req: NextRequest) {
  const client = await adminReadClient()
  if (!client) return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
  const year = Number(req.nextUrl.searchParams.get('startYear'))
  if (!Number.isInteger(year) || year < 2000 || year > 9998) {
    return NextResponse.json({ error: 'Select a valid academic year' }, { status: 400 })
  }
  try {
    const { data: periods, error } = await client.from('academic_periods').select('*').eq('start_year', year).order('term')
    if (error) throw error
    if (!periods?.length) return NextResponse.json({ error: 'Academic year not found' }, { status: 404 })
    // Page every table to avoid silently truncating institutional exports.
    async function read(table: string, select: string, periodId: number, key: string) {
      const rows = []
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await client!.from(table).select(select).eq('period_id', periodId).order(key).range(offset, offset + 499)
        if (error) throw error
        rows.push(...(data || []))
        if (!data || data.length < 500) return rows as Record<string, any>[]
      }
    }
    const students = [], staff = []
    const one = (value: any) => Array.isArray(value) ? value[0] : value
    for (const period of periods as AcademicPeriod[]) {
      const [enrollments, staffEnrollments, records] = await Promise.all([
        read('enrollments', 'student_id, students(student_name), course_sections(year, semester, section_number, courses(course_id, course_name))', period.period_id, 'student_id'),
        read('staff_enrollments', 'staff_id, staffs(staff_name)', period.period_id, 'staff_id'),
        read('clearance_records', 'user_id, status, signed_at, document_snapshot, clearance_templates(course_id, is_active, clearance_departments(dept_name))', period.period_id, 'clearance_id'),
      ])
      const academic = { academic_year: `${period.start_year}-${period.end_year}`, term: period.term }
      function summary(userId: string, courseId: number | null) {
        const relevant = records.filter(r => {
          const template = one(r.clearance_templates)
          const snapshot = r.document_snapshot || {}
          return r.user_id === userId && (period.state === 'ended' ? snapshot.is_active !== false : template?.is_active !== false)
            && (period.state === 'ended'
              ? (courseId === null ? !snapshot.course_name : Boolean(snapshot.course_name))
              : (template?.course_id ?? null) === courseId)
        })
        const departments = relevant.map(r => ({ dept_name: r.document_snapshot?.department || one(one(r.clearance_templates)?.clearance_departments)?.dept_name || 'Department', status: r.status }))
        const completed = relevant.length > 0 && relevant.every(r => r.status === 'Signed' && r.signed_at && Number.isFinite(Date.parse(r.signed_at)))
        return {
          ...academic,
          completed_at: completed ? new Date(Math.max(...relevant.map(r => Date.parse(r.signed_at)))).toISOString() : null,
          overallStatus: relevant.length && relevant.every(r => r.status === 'Signed') ? 'Signed' : relevant.length && relevant.every(r => r.status === 'Pending') ? 'Pending' : 'Incomplete',
          total_departments: departments.length,
          signed_departments: departments.filter(d => d.status === 'Signed').length,
          departments,
          pending_departments: departments.filter(d => d.status !== 'Signed'),
          snapshot: period.state === 'ended' ? relevant[0]?.document_snapshot || {} : {},
        }
      }
      for (const enrollment of enrollments) {
        const section = one(enrollment.course_sections)
        const course = one(section?.courses)
        const { snapshot, ...status } = summary(enrollment.student_id, course?.course_id)
        students.push({ ...status, student_id: enrollment.student_id, student_name: snapshot.student_name || one(enrollment.students)?.student_name || enrollment.student_id,
          course_name: snapshot.course_name || course?.course_name || 'N/A', course_year: snapshot.year ?? section?.year,
          section_number: snapshot.section_number ?? section?.section_number, semester: period.term })
      }
      for (const enrollment of staffEnrollments) {
        const { snapshot, ...status } = summary(enrollment.staff_id, null)
        staff.push({ ...status, staff_id: enrollment.staff_id, staff_name: snapshot.student_name || one(enrollment.staffs)?.staff_name || enrollment.staff_id })
      }
    }
    return NextResponse.json({ students, staff }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Clearance audit export failed:', error)
    return NextResponse.json({ error: 'Unable to load clearance records for this academic year' }, { status: 500 })
  }
}
