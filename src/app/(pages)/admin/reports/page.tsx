'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useFetchStudentTemplates } from '@/hooks/admin/student-templates'
import { useFetchAdminStats } from '@/hooks/admin/fetch-stats'
import { useFetchCourseTemplates } from '@/hooks/admin/course-templates'
import { useFetchDepartments } from '@/hooks/admin/departments'

const ClearanceBarChart = dynamic(() => import('@/components/admin/clearance-bar-chart'), {
  ssr: false,
  loading: () => <div className='h-[380px] bg-slate-50 border border-slate-100 rounded-xl animate-pulse flex items-center justify-center text-xs text-slate-400 font-semibold'>Loading Clearance Rate...</div>
})

const DonutChart = dynamic(() => import('@/components/admin/donut-chart'), {
  ssr: false,
  loading: () => <div className='h-[380px] bg-slate-50 border border-slate-100 rounded-xl animate-pulse flex items-center justify-center text-xs text-slate-400 font-semibold'>Loading Overall Status...</div>
})

interface StatCard {
  label: string;
  value: number;
  badge: string;
  badgeColor: string;
  accentColor: string;
  valueColor: string;
}

interface CourseBar {
  course: string;
  completion: number;
}

interface DonutEntry {
  name: string;
  value: number;
  color: string;
}

interface DeptRow {
  dept_id: number;
  dept_name: string;
  rate: number | null;
  priority: number;
}

// ———— Helpers ————————————————————————————————————————————————————————————————————————————————————————————————

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

// ———— Sub components ————————————————————————————————————————————————————————————————————————————————————————————————

function StatCardItem({ card, index }: { card: StatCard, index: number }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 100)
    return () => clearTimeout(t)
  }, [index])

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 transition-all duration-500 
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div className={`h-1 w-full ${card.accentColor}`} />
      <div className='flex flex-col gap-6 p-5'>
        <p className='text-sm text-slate-500 font-medium mb-2'>{card.label}</p>
        <p className='text-5xl font-bold tracking-tight mb-3 text-gray-800'>{card.value}</p>
      </div>
    </div>
  )
}

function DeptSigningRate() {
  
  const [animated, setAnimated] = useState(false)

  // ———— Hooks ————————————————————————————————————————

  const { data: studentTemplates = [] } = useFetchStudentTemplates()
  const { data: courseTemplates = [], isLoading } = useFetchCourseTemplates()
  const { data: fetchDepts = [] } = useFetchDepartments()

  // ———— Data (Memoized with Set lookups) ————————————————————————————————————————

  const sortedDeptData: DeptRow[] = useMemo(() => {
    const courseTDeptIds = new Set(courseTemplates.flatMap((t) => t.departments.map((d) => d.dept_id)))
    const templateDepts = fetchDepts.filter((fDept) => courseTDeptIds.has(fDept.dept_id))
    
    // Pre-process pending departments into lowercase Sets for O(1) checks
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

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className='bg-white rounded-xl shadow-sm border border-slate-100 p-6'>
      <h2 className='text-base font-bold text-slate-800'>Department signing rate</h2>
      <p className='text-xs text-slate-400 mt-0.5 mb-6'>
        How many students each department has cleared
      </p>

      {sortedDeptData.length === 0 ? (
        <div className='flex min-h-[300px] justify-center items-center'>
          <p className='text-slate-400 text-sm'>No clearance templates found. Create a new one.</p>
        </div>
      ): (

        <div className='space-y-4'>
          {sortedDeptData.map((dept, i) => (
            <div key={dept.dept_name} className='flex items-center gap-4'>
              {/* Name */}
              <span className='w-36 text-sm text-slate-600 shrink-0 truncate'>{dept.dept_name}</span>

              {/* Back track */}
              <div className='flex-1 h-3 bg-slate-100 rounded-full overflow-hidden'>
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
          ))}
        </div>
      )}
    </div>
  )
}

// ———— Main component ————————————————————————————————————————————————————————————————————————————————————————————————

export default function Reports() {

  // ———— Hooks ————————————————————————————————————————

  const { data: adminStats } = useFetchAdminStats()
  const { data: studentTemplates = [] } = useFetchStudentTemplates()

  // ———— Data ————————————————————————————————————————

  const statCards: StatCard[] = [
    {
      label: "Total students",
      value: studentTemplates.length,
      badge: "Enrolled",
      badgeColor: "bg-blue-100 text-blue-700",
      accentColor: "bg-[#0a1128]",
      valueColor: "text-[#1e3a6e]",
    },
    {
      label: "Fully cleared",
      value: adminStats?.signed ?? 0,
      badge: "10% of total",
      badgeColor: "bg-emerald-100 text-green-700",
      accentColor: "bg-emerald-600",
      valueColor: "text-emerald-600",
    },
    {
      label: "In progress",
      value: adminStats?.incomplete ?? 0,
      badge: "10% of total",
      badgeColor: "bg-amber-100 text-amber-700",
      accentColor: "bg-amber-600",
      valueColor: "text-amber-600",
    },
    {
      label: "Not started",
      value: adminStats?.pending ?? 0,
      badge: "zero progress",
      badgeColor: "bg-red-100 text-red-600",
      accentColor: "bg-red-600",
      valueColor: "text-red-600",
    },
  ];

  return (
    <div className='min-h-screen'>
      <div className='space-y-6'>

        {/* Header */}
        <div>
          <h1 className='text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight'>Reports</h1>
          <p className='text-sm text-slate-500 mt-0.5'>Clearance status overview</p>
        </div>

        {/* Stat Cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
          {statCards.map((statCard, i) => (
            <StatCardItem key={statCard.label} card={statCard} index={i} />
          ))}
        </div>

        {/* Charts Row */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
          <div className='lg:col-span-2'>
            <ClearanceBarChart />
          </div>
          <div className='lg:col-span-1'>
            <DonutChart />
          </div>
        </div>

        {/* Department Signing Rate */}
        <DeptSigningRate />
      </div>
    </div>
  )
}