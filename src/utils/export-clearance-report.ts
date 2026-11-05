import { APP_TIME_ZONE } from "@/lib/date-time";
import { StudentTemplates, Staff, CourseTemplateStats } from '@/types/admin'
import { expandCourseAbbreviation, shrinkCourseName } from '@/utils/formatters'
import { formatSectionCode } from '@/components/admin/client-filter-toolbar'

interface ExportClearanceOptions {
  students: (StudentTemplates & { academic_year?: string; term?: number; completed_at?: string | null })[]
  staff: (Staff & { academic_year?: string; term?: number; completed_at?: string | null })[]
  academicYear?: string
  courseTemplates?: CourseTemplateStats[]
}

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""'
  const stringValue = String(value)
  // If the string contains comma, quote, or newline, escape quotes and wrap in quotes
  const escaped = stringValue.replace(/"/g, '""')
  return `"${escaped}"`
}

export async function exportClearanceReport({
  students,
  staff,
  academicYear,
}: ExportClearanceOptions): Promise<{ success: boolean; filename: string; totalRecords: number }> {
  // Load the spreadsheet library only when an admin requests an export.
  const { Workbook } = await import('exceljs')
  const workbook = new Workbook()
  const headers = [
    'Client ID', 'Client Name', 'Client Type', 'Academic Year', 'Term',
    'Academic Program / Department', 'Year & Section', 'Overall Status',
    'Completion Rate (%)', 'Completed At',
  ]
  const groups = new Map<string, (string | number)[][]>()
  const completionDate = (status: string | undefined, value: string | null | undefined) =>
    status === 'Signed' && value && Number.isFinite(Date.parse(value))
      ? new Date(value).toLocaleString('en-US', { timeZone: APP_TIME_ZONE })
      : ''

  for (const student of students) {
    const program = expandCourseAbbreviation(student.course_name) || student.course_name || 'N/A'
    const category = shrinkCourseName(program) || 'Other Programs'
    const rows = groups.get(category) || []
    const total = student.total_departments ?? student.departments?.length ?? 0
    const signed = student.signed_departments ?? student.departments?.filter(d => d.status === 'Signed').length ?? 0
    rows.push([
      String(student.student_id), student.student_name, 'Student', student.academic_year || academicYear || '', student.term ?? '', program,
      student.course_year !== undefined && student.section_number !== undefined
        ? formatSectionCode({ year: student.course_year, semester: student.semester, section_number: student.section_number }) : 'N/A',
      student.overallStatus || 'Incomplete', total > 0 ? Math.round(signed / total * 100) : 0,
      completionDate(student.overallStatus, student.completed_at),
    ])
    groups.set(category, rows)
  }
  // Always provide a Staff tab, including years with no staff enrollments.
  groups.set('Staff', staff.map(person => {
    const total = person.total_departments ?? person.departments?.length ?? 0
    const signed = person.signed_departments ?? person.departments?.filter(d => d.status === 'Signed').length ?? 0
    return [String(person.staff_id), person.staff_name, 'Staff', person.academic_year || academicYear || '', person.term ?? '',
      'Staff Clearance Roster', 'N/A', person.overallStatus || 'Incomplete', total > 0 ? Math.round(signed / total * 100) : 0,
      completionDate(person.overallStatus, person.completed_at)]
  }))
  const usedNames = new Set<string>()
  for (const [category, rows] of groups) {
    const base = category.replace(/[\\/?*:[\]]/g, ' ').replace(/^'+|'+$/g, '').trim().slice(0, 31) || 'Program'
    let name = base, suffix = 1
    while (usedNames.has(name.toLowerCase()) || (category !== 'Staff' && name.toLowerCase() === 'staff')) {
      const ending = ` (${suffix++})`
      name = base.slice(0, 31 - ending.length) + ending
    }
    usedNames.add(name.toLowerCase())
    const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] })
    sheet.columns = headers.map((header, index) => ({ header, width: [20, 32, 14, 20, 10, 48, 20, 20, 23, 28][index] }))
    sheet.addRows(rows)
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF162033' } }
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } }
    sheet.getColumn(9).numFmt = '0"%"'
  }
  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `institutional-clearance-audit-${academicYear ? academicYear + '-' : ''}${new Date().toISOString().slice(0, 10)}.xlsx`
  const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return { success: true, filename, totalRecords: students.length + staff.length }
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
    escapeCsvField(r.signedAt ? new Date(r.signedAt).toLocaleString("en-US", { timeZone: APP_TIME_ZONE }) : 'Unsigned'),
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

