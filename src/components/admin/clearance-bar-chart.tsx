'use client'

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
      <div className='bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm'>
        <p className='font-semibold text-slate-700'>{label}</p>
        <p className='text-[#1e3a6e]'>{payload[0].value}% completion</p>
      </div>
    )
  }

  return null
}

export default function ClearanceBarChart() {
  const { data: courseTemplates = [] } = useFetchCourseTemplates()

  const courseData: CourseBar[] = courseTemplates.map((cT) => ({
    course: shrinkCourseName(cT.course_name) || cT.course_name,
    completion: cT.completion_rate,
  }))

  return (
    <div className='bg-white rounded-xl shadow-sm border border-slate-100 p-6'>
      <h2 className='text-base font-bold text-slate-800'>Clearance rate by course</h2>
      <p className='text-xs text-slate-400 mt-0.5 mb-5'>Based on enrolled students</p>

      {/* Legend */}
      <div className='flex items-center gap-2 mb-4'>
        <span className='inline-block w-3 h-3 rounded-sm bg-[#1e3a6e]' />
        <span className='text-xs text-slate-500'>Completion %</span>
      </div>

      <ResponsiveContainer width='100%' height={300}>
        <BarChart data={courseData} margin={{ top: 4, right: 8, left: -16, bottom: 0, }} barSize={48}>
          <CartesianGrid strokeDasharray='3 3' stroke='#f1f5f9' vertical={false} />
          <XAxis 
            dataKey='course'
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
          />
          <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey='completion' fill='#1e3a6e' radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
