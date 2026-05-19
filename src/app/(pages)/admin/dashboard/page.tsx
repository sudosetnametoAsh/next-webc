'use client'

import { useEffect, useState } from 'react'
import { useFetchCourseTemplates } from '@/hooks/admin/course-templates'
import { useFetchDepartments } from '@/hooks/admin/departments'
import { useFetchStudentTemplates } from '@/hooks/admin/student-templates'
import Link from 'next/link'
import AdminStats from '@/components/admin/admin-stats'
import { shrinkCourseName, expandCourseAbbreviation } from '@/utils/formatters'

// ———— TYPES ————————————————————————————————————————————————————————————————————————————————————————————————

type DeptRow = {
  dept_id: number;
  dept_name: string;
  rate: number | null;
  priority: number;
}

// ———— HELPERS ————————————————————————————————————————————————————————————————————————————————————————————————

function getDeptBarColor(rate: number | null): string {

  if (rate === null) return "bg-slate-200";
  if (rate >= 70) return "bg-emerald-600";
  if (rate >= 40) return "bg-amber-500";
  if (rate >= 20) return "bg-orange-500";

  return "bg-red-600";
}

function getDeptRateLabel(rate: number | null): string {

  if (rate === null) return "—";

  return `${rate}%`;
}

function getDeptRateColor(rate: number | null): string {

  if (rate === null) return "text-slate-400";
  if (rate >= 70) return "text-emerald-600";
  if (rate >= 40) return "text-amber-500";
  if (rate >= 20) return "text-orange-500";

  return "text-red-600";
}

// ———— SUB COMPONENTS ————————————————————————————————————————————————————————————————————————————————————————————————

function CourseBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-w-[70px] flex justify-center items-center bg-blue-100 px-2 py-4 rounded-lg'>
      <p className='text-xs sm:text-sm font-medium text-blue-900'>{children}</p>
    </div>
  )
}

// ———— MAIN COMPONENT ————————————————————————————————————————————————————————————————————————————————————————————————

export default function AdminDashboard() {

  // ———— State —————————————————————————————

  const [animated, setAnimated] = useState(false)

  // ————————————————————————————————————————
  // Hooks
  // ————————————————————————————————————————

  const { data: courseTemplates = [] } = useFetchCourseTemplates()
  const { data: fetchDepts = [] } = useFetchDepartments()
  const { data: studentTemplates = [] } = useFetchStudentTemplates()

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300)
    return () => clearTimeout(t)
  }, [])

  // ————————————————————————————————————————
  // Data
  // ————————————————————————————————————————

  const courseTDepts = courseTemplates.flatMap((t) => t.departments)
  const courseTDeptIds = courseTDepts.map((tDept) => tDept.dept_id)
  const templateDepts = fetchDepts.filter((fDept) => courseTDeptIds.includes(fDept.dept_id)) ?? []
  const pendingDepts = studentTemplates.map((sT) => sT.pending_departments.map((pD) => pD.dept_name)) ?? []

  const signedCount = (deptName: string) => {

    let count = 0
  
    for (const pD of pendingDepts) {
      
      if (!pD.some((d) => d.trim().toLowerCase() === deptName.trim().toLowerCase())) {
        count++
      }
    }
    
    return count
  }

  const finalTemplateDepts: DeptRow[] = templateDepts.map((obj) => ({
    ...obj,
    rate: Math.round(signedCount(obj.dept_name) / (studentTemplates.length || 1) * 100) || null,
    priority: obj.dept_name.trim().toLowerCase().includes('cashier') ? 1 
      : obj.dept_name.trim().toLowerCase().includes('registrar') ? fetchDepts.length : 3
  }))

  const sortedTemplateDepts = finalTemplateDepts.toSorted((a, b) => a.priority - b.priority)

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 mb-6">Dashboard</h1>
      <AdminStats />

      <div className='flex flex-col 3xl:flex-row justify-evenly gap-4 mt-12'>

        {/* Course Templates */}
        <div className='min-w-sm 3xl:min-w-3xl border border-gray-300 rounded-lg p-6'>
          <div className='flex items-center justify-between border-b pb-4'>
            <p className='text-lg font-medium'>Course Templates</p>
            <Link
              href='/admin/templates'
              className='text-sm text-blue-700 hover:text-blue-800 shadow-[inset_0_-1px_0_0_var(--color-blue-400)] hover:shadow-none'
            >
              View all
            </Link>
          </div>

          <div className='pt-4'>
            {courseTemplates.length === 0 ? (
              <div className='flex min-h-[300px] justify-center items-center'>
                <p className='text-slate-400 text-sm'>No clearance templates found. Create a new one.</p>
              </div>
            ): (

              <ul className='divide-y divide-gray-200'>
                {courseTemplates.map((template) => (
                  
                  <li key={template.course_name} className='flex items-center gap-4 py-3'>
                    <CourseBadge>
                      {shrinkCourseName(template.course_name) || template.course_name}
                    </CourseBadge>

                    <div className='w-full flex justify-between'>
                      <div className='flex flex-col gap-1'>
                        <p className='text-sm sm:text-base font-medium'>{expandCourseAbbreviation(template.course_name) || template.course_name}</p>
                        <p className='text-xs sm:text-sm text-gray-500'>{template.students_enrolled} students enrolled</p>
                      </div>

                      <div className='min-w-[100px] flex flex-col justify-between'>
                        <p className='flex justify-end'>{template.completion_rate}%</p>
                        <div className='h-1.5 bg-gray-200 rounded-full overflow-hidden'>
                          <div 
                            className='h-full bg-blue-900 transition-all duration-300'
                            style={{ width: `${template.completion_rate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Department Status */}
        <div className='min-w-sm 3xl:min-w-3xl border border-gray-300 rounded-lg p-6'>
          <div className='border-b pb-4'>
            <p className='text-lg font-medium'>Department Status</p>
          </div>

          <div className='pt-6'>

            {sortedTemplateDepts.length === 0 ? (
              <div className='flex min-h-[300px] justify-center items-center'>
                <p className='text-slate-400 text-sm'>No clearance templates found. Create a new one.</p>
              </div>
            ): (

              <ul className='space-y-6'>

                {sortedTemplateDepts.map((dept, i) => (

                  <li key={dept.dept_name} className='flex justify-between items-center gap-2'>

                    {/* Name */}
                    <span className='min-w-[64px] text-sm sm:text-base font-medium truncate'>{dept.dept_name}</span>

                    <div className='min-w-[150px] flex items-center gap-2'>
                      {/* Back track */}
                      <div className='flex-1 h-2 bg-gray-200 rounded-full overflow-hidden'>
                        {dept.rate !== null && (
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ease-out ${getDeptBarColor(dept.rate)}`}
                            style={{ width: animated ? `${dept.rate}%` : '0%', transitionDelay: `${i * 80}ms`, }}
                          />
                        )}
                      </div>

                      {/* Rate label */}
                      <span className={`w-8 text-sm font-semibold text-right shrink-0 ${getDeptRateColor(dept.rate)}`}>
                        {getDeptRateLabel(dept.rate)}
                      </span>
                    </div>

                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </>
  )
}