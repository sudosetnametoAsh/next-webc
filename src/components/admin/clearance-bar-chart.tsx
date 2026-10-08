'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useFetchCourseTemplates } from '@/hooks/admin/course-templates'
import { shrinkCourseName } from '@/utils/formatters'

interface CourseBar {
  course: string;
  completion: number;
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className='bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm dark:bg-slate-850 dark:border-slate-700'>
        <p className='font-semibold text-slate-700 dark:text-slate-200'>{label}</p>
        <p className='text-[#1e3a6e] dark:text-amber-400 font-bold'>{payload[0].value}% completion</p>
      </div>
    )
  }

  return null
}

export default function ClearanceBarChart() {
  const { data: courseTemplates = [] } = useFetchCourseTemplates()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  const courseData: CourseBar[] = courseTemplates.map((cT) => ({
    course: shrinkCourseName(cT.course_name) || cT.course_name,
    completion: cT.completion_rate,
  }))

  return (
    <div className='bg-white rounded-xl shadow-sm border border-slate-100 p-6 dark:bg-slate-900/90 dark:border-slate-800'>
      <h2 className='text-base font-bold text-slate-800 dark:text-slate-100'>Clearance rate by course</h2>
      <p className='text-xs text-slate-400 dark:text-slate-500 mt-0.5 mb-5'>Based on enrolled students</p>

      {/* Legend */}
      <div className='flex items-center gap-2 mb-4'>
        <span className='inline-block w-3 h-3 rounded-sm bg-[#1e3a6e] dark:bg-amber-500' />
        <span className='text-xs text-slate-500 dark:text-slate-400'>Completion %</span>
      </div>

      <ResponsiveContainer width='100%' height={300}>
        <BarChart data={courseData} margin={{ top: 4, right: 8, left: -16, bottom: 0, }} barSize={48}>
          <CartesianGrid strokeDasharray='3 3' stroke={isDark ? '#1e293b' : '#f1f5f9'} vertical={false} />
          <XAxis 
            dataKey='course'
            tick={{ fontSize: 12, fill: isDark ? '#64748b' : '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: isDark ? '#64748b' : '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
          />
          <Tooltip content={<CustomBarTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }} />
          <Bar dataKey='completion' fill={isDark ? '#F59E0B' : '#1e3a6e'} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
