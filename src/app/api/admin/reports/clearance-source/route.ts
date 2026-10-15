import { db } from '@/lib/db'
import {
  students,
  staffs,
  clearanceRecords,
  clearanceTemplates,
  clearanceDepartments,
  clearanceTasks,
  courses,
  courseSections,
} from '@/lib/db/schema'
import { eq, desc, or, and, isNull } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth/require-auth'
import type { ClearanceReportSource, ClearanceTemplateInfo, ClearanceRecord, Signoff } from '@/lib/reports/types'

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req, ["Admin"])
  if ("errorResponse" in auth) return auth.errorResponse

  try {
    // Get current term from most recent course section
    const latestSection = await db
      .select({
        year: courseSections.year,
        semester: courseSections.semester,
      })
      .from(courseSections)
      .orderBy(desc(courseSections.year), desc(courseSections.semester))
      .limit(1)

    const term = latestSection.length > 0
      ? `${getSemesterLabel(latestSection[0].semester)}, S.Y. ${latestSection[0].year}`
      : `1st Semester, S.Y. ${new Date().getFullYear()}`

    // CRITICAL FIX: The clearance_templates table structure is:
    // Each row = (course_id, dept_id, staff_id) - ONE department per template row
    // Multiple template rows can have the same course_id
    // clearance_records.template_id references ONE specific template row
    //
    // This means: To get ALL departments for a user, we need to find ALL their clearance records
    // that share the same course (or all STAFF type records)

    // Step 1: Fetch ALL templates to understand course → departments mapping
    const allTemplates = await db
      .select({
        templateId: clearanceTemplates.templateId,
        courseId: clearanceTemplates.courseId,
        courseName: courses.courseName,
        deptId: clearanceTemplates.deptId,
        deptName: clearanceDepartments.deptName,
        staffId: clearanceTemplates.staffId,
      })
      .from(clearanceTemplates)
      .leftJoin(courses, eq(clearanceTemplates.courseId, courses.courseId))
      .leftJoin(clearanceDepartments, eq(clearanceTemplates.deptId, clearanceDepartments.deptId))

    // Build: courseKey → { code, name, kind, departments[], staffHandlers }
    const courseInfoMap = new Map<string, {
      code: string
      name: string
      kind: 'student' | 'staff'
      departments: string[]
      staffHandlers: Map<string, string> // staffId → deptName
    }>()

    // Build: templateId → courseKey
    const templateIdToCourseKey = new Map<number, string>()

    for (const t of allTemplates) {
      const isStaff = t.courseId === null
      const courseKey = isStaff ? 'STAFF' : t.courseId!.toString()
      const code = isStaff ? 'STAFF' : (t.courseName || 'Unknown')
      const name = isStaff ? 'Staff Clearance' : (t.courseName || 'Unknown Course')

      templateIdToCourseKey.set(t.templateId, courseKey)

      if (!courseInfoMap.has(courseKey)) {
        courseInfoMap.set(courseKey, {
          code,
          name,
          kind: isStaff ? 'staff' : 'student',
          departments: [],
          staffHandlers: new Map(),
        })
      }

      const courseInfo = courseInfoMap.get(courseKey)!
      if (t.deptName && !courseInfo.departments.includes(t.deptName)) {
        courseInfo.departments.push(t.deptName)
      }
      if (t.staffId && t.deptName) {
        courseInfo.staffHandlers.set(t.staffId, t.deptName)
      }
    }

    console.log('=== DEBUG: Course Info ===')
    console.log('Total courses/staff types:', courseInfoMap.size)
    courseInfoMap.forEach((info, key) => {
      console.log(`  ${key}: ${info.code}, ${info.departments.length} depts`)
    })

    // Build templates list for response
    const templates: ClearanceTemplateInfo[] = Array.from(courseInfoMap.values()).map(c => ({
      code: c.code,
      name: c.name,
      kind: c.kind,
    }))

    // Step 2: Fetch ALL clearance records
    const allClearanceRecords = await db
      .select({
        clearanceId: clearanceRecords.clearanceId,
        userId: clearanceRecords.userId,
        templateId: clearanceRecords.templateId,
        studentName: students.studentName,
        studentId: students.studentId,
        staffName: staffs.staffName,
        staffId: staffs.staffId,
      })
      .from(clearanceRecords)
      .leftJoin(students, eq(clearanceRecords.userId, students.studentId))
      .leftJoin(staffs, eq(clearanceRecords.userId, staffs.staffId))

    console.log('=== DEBUG: Clearance Records ===')
    console.log('Total clearance_records rows:', allClearanceRecords.length)

    // Group clearance records by userId
    const userClearancesMap = new Map<string, Array<typeof allClearanceRecords[0]>>()
    for (const cr of allClearanceRecords) {
      if (!userClearancesMap.has(cr.userId)) {
        userClearancesMap.set(cr.userId, [])
      }
      userClearancesMap.get(cr.userId)!.push(cr)
    }

    console.log('Unique users with clearances:', userClearancesMap.size)

    // Step 3: Fetch ALL tasks
    const allTasks = await db
      .select({
        clearanceId: clearanceTasks.clearanceId,
        status: clearanceTasks.status,
        staffId: clearanceTasks.staffId,
      })
      .from(clearanceTasks)

    // Build: clearanceId → tasks[]
    const tasksByClearanceMap = new Map<number, Array<{ deptName: string; status: string }>>()

    // Build global staffId → deptName map
    const globalStaffDeptMap = new Map<string, string>()
    courseInfoMap.forEach(c => {
      c.staffHandlers.forEach((deptName, staffId) => {
        globalStaffDeptMap.set(staffId, deptName)
      })
    })

    for (const task of allTasks) {
      const deptName = globalStaffDeptMap.get(task.staffId)
      if (!deptName) continue

      if (!tasksByClearanceMap.has(task.clearanceId)) {
        tasksByClearanceMap.set(task.clearanceId, [])
      }

      tasksByClearanceMap.get(task.clearanceId)!.push({
        deptName,
        status: task.status || 'Pending',
      })
    }

    // Step 4: Build records - ONE per USER (not per clearance_record!)
    const records: ClearanceRecord[] = []

    for (const [userId, userClearances] of userClearancesMap) {
      // All clearances for this user should have the same course type
      const firstClearance = userClearances[0]
      const courseKey = templateIdToCourseKey.get(firstClearance.templateId)
      if (!courseKey) continue

      const courseInfo = courseInfoMap.get(courseKey)
      if (!courseInfo) continue

      const name = firstClearance.studentName || firstClearance.staffName || 'Unknown'
      const idNumber = firstClearance.studentId || firstClearance.staffId || ''

      // Collect ALL tasks from ALL clearance records for this user
      const allUserTasks: Array<{ deptName: string; status: string }> = []
      for (const cr of userClearances) {
        const tasks = tasksByClearanceMap.get(cr.clearanceId) || []
        allUserTasks.push(...tasks)
      }

      // Build signoffs for each department in the course
      const signoffs: Signoff[] = courseInfo.departments.map(deptName => {
        const deptTasks = allUserTasks.filter(t => t.deptName === deptName)

        let status: Signoff['status'] = 'pending'

        if (deptTasks.length > 0) {
          const allCleared = deptTasks.every(t => t.status === 'Cleared')
          const anyProgress = deptTasks.some(t =>
            t.status === 'Submitted' ||
            t.status === 'Cleared' ||
            t.status === 'Rejected' ||
            t.status === 'Flagged' ||
            t.status === 'Verified'
          )

          if (allCleared) {
            status = 'signed'
          } else if (anyProgress) {
            status = 'incomplete'
          }
        }

        return { department: deptName, status }
      })

      records.push({
        id: `${courseInfo.code}-${userId}`,
        name,
        idNumber,
        templateCode: courseInfo.code,
        signoffs,
      })
    }

    console.log('=== DEBUG: Final ===')
    console.log('Total records built:', records.length)
    console.log('Expected: 260 (253 students + 7 staff)')
    console.log('Sample record:', records[0])
    console.log('==================')

    const source: ClearanceReportSource = {
      term,
      templates,
      records,
    }

    return NextResponse.json({ data: source }, { status: 200 })

  } catch (error: any) {
    console.error('Fetch clearance report source error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function getSemesterLabel(semester: number): string {
  const labels: Record<number, string> = {
    1: '1st Semester',
    2: '2nd Semester',
    3: 'Summer',
  }
  return labels[semester] || '1st Semester'
}
