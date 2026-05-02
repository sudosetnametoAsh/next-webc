'use client'

import Link from 'next/link'
import AdminStats from '@/components/admin/admin-stats'
import { useFetchCourseTemplates } from '@/hooks/admin/course-templates'
import { useFetchDepartments } from '@/hooks/admin/departments'
import { useFetchStudentTemplates } from '@/hooks/admin/student-templates'
import { shrinkCourseName, expandCourseAbbreviation } from '@/utils/formatters'

function CourseBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-w-[70px] flex justify-center items-center bg-blue-100 px-2 py-4 rounded-lg'>
      <p className='text-xs sm:text-sm font-medium text-blue-900'>{children}</p>
    </div>
  )
}

export default function AdminDashboard() {

  const { data: courseTemplates = [], isLoading } = useFetchCourseTemplates()
  const { data: fetchDepts = [] } = useFetchDepartments()
  const { data: studentTemplates = [] } = useFetchStudentTemplates()

  const courseTDepts = courseTemplates.flatMap((t) => t.departments)
  const courseTDeptIds = courseTDepts.map((tDept) => tDept.dept_id)
  const templateDepts = fetchDepts.filter((fDept) => courseTDeptIds.includes(fDept.dept_id)) ?? []
  const pendingDepts = studentTemplates.map((sT) => sT.pending_departments.map((pD) => pD.dept_name)) ?? []
  

  const pendingCount = (deptName: string) => {
    let count = 0
  
    for (const pD of pendingDepts) {
      
      if (pD.some((d) => d.trim().toLowerCase() === deptName.trim().toLowerCase())) {
        count++
      }
    }
    
    return count
  }

  const signedCount = (deptName: string) => {
    let count = 0
  
    for (const pD of pendingDepts) {
      
      if (!pD.some((d) => d.trim().toLowerCase() === deptName.trim().toLowerCase())) {
        count++
      }
    }
    
    return count
  }

  const finalTemplateDepts = templateDepts.map((obj) => ({
    ...obj,
    count: { 
      pending: pendingCount(obj.dept_name), 
      signed: signedCount(obj.dept_name), 
    },
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

          <div className='pt-4'>
            {courseTemplates.length === 0 ? (
              <div className='flex min-h-[300px] justify-center items-center'>
                <p className='text-slate-400 text-sm'>No clearance templates found. Create a new one.</p>
              </div>
            ): (
              <ul className='divide-y divide-gray-200'>
                {sortedTemplateDepts.map((templateDept) => (
                  
                  <li key={templateDept.dept_name} className='flex gap-4 py-3'>
                    <p className='text-2xl text-yellow-500'>&#8226;</p>

                    <div className='w-full flex flex-wrap gap-2 items-center justify-between'>
                      <p className='text-sm sm:text-base font-medium'>{templateDept.dept_name}</p>

                      <div className='flex gap-4'>
                        <div className='bg-red-100 border border-red-50 rounded-full px-3 py-2'>
                          <p className='text-xs text-red-700'>{templateDept.count.pending} pending</p>
                        </div>
                        <div className='bg-emerald-100 border border-emerald-50 rounded-full px-3 py-2'>
                          <p className='text-xs text-emerald-700'>{templateDept.count.signed} signed</p>
                        </div>
                      </div>
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