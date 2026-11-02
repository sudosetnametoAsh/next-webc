import { StudentTemplates, Staff, CourseTemplateStats } from '@/types/admin'
import { expandCourseAbbreviation } from '@/utils/formatters'
import { formatSectionCode } from '@/components/admin/client-filter-toolbar'

interface ExportClearanceOptions {
  students: StudentTemplates[]
  staff: Staff[]
  courseTemplates?: CourseTemplateStats[]
}

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""'
  const stringValue = String(value)
  // If the string contains comma, quote, or newline, escape quotes and wrap in quotes
  const escaped = stringValue.replace(/"/g, '""')
  return `"${escaped}"`
}

export function exportClearanceReport({
  students,
  staff,
  courseTemplates = [],
}: ExportClearanceOptions): { success: boolean; filename: string; totalRecords: number } {
  const headers = [
    'Client ID',
    'Client Name',
    'Client Type',
    'Academic Program / Department',
    'Year & Section',
    'Overall Status',
    'Signed Offices',
    'Total Offices',
    'Completion Rate (%)',
    'Pending Clearance Offices',
    'Exported At',
  ]

  const now = new Date().toISOString()
  const rows: string[][] = []

  // 1. Process Student Records
  students.forEach((s) => {
    const courseFull = expandCourseAbbreviation(s.course_name) || s.course_name || 'N/A'
    const section =
      s.course_year !== undefined && s.section_number !== undefined
        ? formatSectionCode({
            year: s.course_year,
            semester: s.semester,
            section_number: s.section_number,
          })
        : 'N/A'

    const totalDepts = s.total_departments || (s.departments ? s.departments.length : 6)
    const signedDepts =
      s.signed_departments ??
      (s.departments ? s.departments.filter((d) => d.status === 'Signed').length : 0)

    const rate = totalDepts > 0 ? Math.round((signedDepts / totalDepts) * 100) : 0

    const pendingDepts =
      s.pending_departments && s.pending_departments.length > 0
        ? s.pending_departments.map((d) => d.dept_name).join('; ')
        : s.departments
        ? s.departments
            .filter((d) => d.status !== 'Signed')
            .map((d) => d.dept_name)
            .join('; ')
        : 'None'

    const statusDisplay = s.isOverdue
      ? `Overdue (${s.overduePhaseLabel || 'Phase'})`
      : s.overallStatus || 'Incomplete'

    rows.push([
      String(s.student_id),
      s.student_name,
      'Student',
      courseFull,
      section,
      statusDisplay,
      String(signedDepts),
      String(totalDepts),
      `${rate}%`,
      pendingDepts || 'None',
      now,
    ])
  })

  // 2. Process Staff Records
  staff.forEach((st) => {
    const totalDepts = st.total_departments || (st.departments ? st.departments.length : 4)
    const signedDepts =
      st.signed_departments ??
      (st.departments ? st.departments.filter((d) => d.status === 'Signed').length : 0)

    const rate = totalDepts > 0 ? Math.round((signedDepts / totalDepts) * 100) : 0

    const pendingDepts =
      st.pending_departments && st.pending_departments.length > 0
        ? st.pending_departments.map((d) => d.dept_name).join('; ')
        : st.departments
        ? st.departments
            .filter((d) => d.status !== 'Signed')
            .map((d) => d.dept_name)
            .join('; ')
        : 'None'

    const staffStatusDisplay = st.isOverdue
      ? `Overdue (${st.overduePhaseLabel || 'Staff'})`
      : st.overallStatus || 'Incomplete'

    rows.push([
      String(st.staff_id),
      st.staff_name,
      'Staff',
      'Staff Clearance Roster',
      'N/A',
      staffStatusDisplay,
      String(signedDepts),
      String(totalDepts),
      `${rate}%`,
      pendingDepts || 'None',
      now,
    ])
  })

  // 3. Assemble CSV Content (UTF-8 BOM for Excel compatibility)
  const csvLines = [
    headers.map(escapeCsvField).join(','),
    ...rows.map((row) => row.map(escapeCsvField).join(',')),
  ]
  const csvContent = '\uFEFF' + csvLines.join('\r\n')

  // 4. Trigger Instant Client-side Download
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `institutional-clearance-audit-${dateStr}.csv`
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return {
    success: true,
    filename,
    totalRecords: rows.length,
  }
}

export interface DepartmentExportRecord {
  clientId: string
  clientName: string
  program: string
  section: string
  status: string
  signedAt: string | null
  incompleteTasks: number
}

export interface DepartmentExportOptions {
  departmentName: string
  records: DepartmentExportRecord[]
}

export function exportDepartmentClearanceReport({
  departmentName,
  records,
}: DepartmentExportOptions): { success: boolean; filename: string; totalRecords: number } {
  const headers = [
    'Client ID',
    'Client Name',
    'Academic Program / Roster',
    'Section / Group',
    'Clearance Status',
    'Signed Date & Time',
    'Incomplete Tasks',
    'Department',
    'Exported At',
  ]

  const now = new Date().toISOString()
  const rows: string[][] = records.map((r) => [
    escapeCsvField(r.clientId),
    escapeCsvField(r.clientName),
    escapeCsvField(r.program),
    escapeCsvField(r.section),
    escapeCsvField(r.status),
    escapeCsvField(r.signedAt ? new Date(r.signedAt).toLocaleString() : 'Unsigned'),
    escapeCsvField(r.incompleteTasks),
    escapeCsvField(departmentName),
    escapeCsvField(now),
  ])

  const csvLines = [
    headers.map(escapeCsvField).join(','),
    ...rows.map((row) => row.join(',')),
  ]
  const csvContent = '\uFEFF' + csvLines.join('\r\n')

  const sanitizedDept = (departmentName || 'department').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `${sanitizedDept}-clearance-audit-${dateStr}.csv`
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return {
    success: true,
    filename,
    totalRecords: rows.length,
  }
}

