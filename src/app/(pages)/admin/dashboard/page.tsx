'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useFetchCourseTemplates } from '@/hooks/admin/course-templates'
import { useFetchDepartments } from '@/hooks/admin/departments'
import { useFetchStudentTemplates } from '@/hooks/admin/student-templates'
import Link from 'next/link'
import AdminStats from '@/components/admin/admin-stats'
import { shrinkCourseName, expandCourseAbbreviation } from '@/utils/formatters'
import { ArrowUpRight, BookOpenText, Building2 } from 'lucide-react'

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
  if (rate >= 20) return "bg-amber-600";
  return "bg-rose-600";
}

function getDeptRateLabel(rate: number | null): string {
  if (rate === null) return "—";
  return `${rate}%`;
}

function getDeptRateColor(rate: number | null): string {
  if (rate === null) return "text-slate-400";
  if (rate >= 70) return "text-emerald-700";
  if (rate >= 40) return "text-amber-700";
  if (rate >= 20) return "text-amber-800";
  return "text-rose-700";
}

function CourseBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-w-[60px] flex justify-center items-center bg-[#0B192C] px-2.5 py-3 rounded-xl shadow-2xs dark:bg-[#0B192C] dark:border dark:border-slate-700'>
      <p className='text-xs font-bold text-amber-400 font-mono'>{children}</p>
    </div>
  )
}

// ———— MAIN COMPONENT ————————————————————————————————————————————————————————————————————————————————————————————————

export default function AdminDashboard() {
  const [animated, setAnimated] = useState(false)

  const { data: courseTemplates = [] } = useFetchCourseTemplates()
  const { data: fetchDepts = [] } = useFetchDepartments()
  const { data: studentTemplates = [] } = useFetchStudentTemplates()

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 150)
    return () => clearTimeout(t)
  }, [])

  // Data memoization with Set lookups
  const sortedTemplateDepts = useMemo(() => {
    const courseTDeptIds = new Set(courseTemplates.flatMap((t) => t.departments.map((d) => d.dept_id)))
    const templateDepts = fetchDepts.filter((fDept) => courseTDeptIds.has(fDept.dept_id))
    
    const pendingSets = studentTemplates.map(
      (sT) => new Set(sT.pending_departments.map((pD) => pD.dept_name.trim().toLowerCase()))
    )
    const totalStudents = studentTemplates.length || 1

    const finalTemplateDepts: DeptRow[] = templateDepts.map((obj) => {
      const lowerName = obj.dept_name.trim().toLowerCase()
      let signedCount = 0
      for (const pSet of pendingSets) {
        if (!pSet.has(lowerName)) {
          signedCount++
        }
      }

      return {
        ...obj,
        rate: Math.round((signedCount / totalStudents) * 100) || null,
        priority: lowerName.includes('cashier') ? 1 
          : lowerName.includes('registrar') ? fetchDepts.length : 3
      }
    })

    return finalTemplateDepts.toSorted((a, b) => a.priority - b.priority)
  }, [courseTemplates, fetchDepts, studentTemplates])

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Dashboard Title & Executive Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Institutional Clearance Governance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Campus-wide clearance progression, department completion rates, and curriculum templates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/templates"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B192C] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 dark:hover:bg-slate-700 dark:border dark:border-slate-700 transition-colors"
          >
            <span>Manage Templates</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-amber-400" />
          </Link>
        </div>
      </div>

      {/* KPI Ribbon */}
      <AdminStats />

      {/* Analytics Matrix Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>

        {/* 1. Course Templates Breakdown */}
        <div className='flex flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-100'>
          <div className='flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4'>
            <div className="flex items-center gap-2">
              <BookOpenText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <h2 className='text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight'>
                Academic Program Clearance Rates
              </h2>
            </div>
            <Link
              href='/admin/templates'
              className='text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-amber-400 dark:hover:text-amber-300 inline-flex items-center gap-1'
            >
              <span>View all</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className='pt-4 flex-1'>
            {courseTemplates.length === 0 ? (
              <div className='flex min-h-[240px] justify-center items-center'>
                <p className='text-slate-400 dark:text-slate-500 text-xs'>No clearance templates configured. Create one in Templates.</p>
              </div>
            ) : (
              <ul className='divide-y divide-slate-100 dark:divide-slate-800'>
                {courseTemplates.map((template) => (
                  <li key={template.course_name} className='flex items-center gap-4 py-3.5 first:pt-1 last:pb-1'>
                    <CourseBadge>
                      {shrinkCourseName(template.course_name) || template.course_name}
                    </CourseBadge>

                    <div className='w-full flex items-center justify-between gap-4'>
                      <div className='flex flex-col gap-0.5 min-w-0'>
                        <p className='text-sm font-bold text-slate-900 dark:text-slate-100 truncate'>
                          {expandCourseAbbreviation(template.course_name) || template.course_name}
                        </p>
                        <p className='text-xs text-slate-500 dark:text-slate-400 tabular-nums'>
                          {template.students_enrolled} enrolled candidate{template.students_enrolled === 1 ? '' : 's'}
                        </p>
                      </div>

                      <div className='min-w-[110px] flex flex-col items-end gap-1 shrink-0'>
                        <span className='text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums'>
                          {template.completion_rate}% Cleared
                        </span>
                        <div className='h-1.5 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden'>
                          <div 
                            className='h-full bg-emerald-600 rounded-full transition-[width] duration-500 ease-out'
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

        {/* 2. Department Bottleneck & Completion Matrix */}
        <div className='flex flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-100'>
          <div className='flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4'>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <h2 className='text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight'>
                Department Completion Pipeline
              </h2>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Campus-wide rate</span>
          </div>

          <div className='pt-4 flex-1'>
            {sortedTemplateDepts.length === 0 ? (
              <div className='flex min-h-[240px] justify-center items-center'>
                <p className='text-slate-400 dark:text-slate-500 text-xs'>No active department pipelines discovered.</p>
              </div>
            ) : (
              <ul className='space-y-4'>
                {sortedTemplateDepts.map((dept, i) => (
                  <li key={dept.dept_name} className='flex items-center justify-between gap-3'>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className='text-xs font-bold text-slate-800 dark:text-slate-200 truncate'>
                          {dept.dept_name}
                        </span>
                        <span className={`text-xs font-bold tabular-nums ${getDeptRateColor(dept.rate)}`}>
                          {getDeptRateLabel(dept.rate)}
                        </span>
                      </div>
                      <div className='h-2 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden'>
                        {dept.rate !== null && (
                          <div 
                            className={`h-full rounded-full transition-[width] duration-700 ease-out ${getDeptBarColor(dept.rate)}`}
                            style={{
                              width: animated ? `${dept.rate}%` : '0%',
                              transitionDelay: `${i * 60}ms`,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}