'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useFetchAdminStats } from '@/hooks/admin/fetch-stats'
import { useFetchStudentTemplates } from '@/hooks/admin/student-templates'

interface DonutEntry {
  name: string;
  value: number;
  color: string;
}

export default function DonutChart() {
  const { data: adminStats } = useFetchAdminStats()
  const { data: studentTemplates = [] } = useFetchStudentTemplates()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  const clearedPercent = Math.round(((adminStats?.signed ?? 0) / (studentTemplates.length || 1)) * 100)
  const inProgressPercent = Math.round(((adminStats?.incomplete ?? 0) / (studentTemplates.length || 1)) * 100)
  const pendingPercent = Math.round(((adminStats?.pending ?? 0) / (studentTemplates.length || 1)) * 100)

  const donutData: DonutEntry[] = [
    { name: "Cleared", value: clearedPercent, color: "#10B981" },
    { name: "In progress", value: inProgressPercent, color: '#F59E0B' },
    { name: "Pending", value: pendingPercent, color: "#EF4444" },
  ]

  return (
    <div className='bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col dark:bg-slate-900/90 dark:border-slate-800'>
      <h2 className='text-base font-bold text-slate-800 dark:text-slate-100'>Overall clearance status</h2>
      <p className='text-xs text-slate-400 dark:text-slate-500 mt-0.5 mb-4'>All students combined</p>

      {/* Legend */}
      <div className='flex flex-wrap gap-4 mb-4'>
        {donutData.map((d) => (
          <div key={d.name} className='flex items-center gap-1.5'>
            <span className='w-2.5 h-2.5 rounded-full inline-block' style={{ background: d.color }} />
            <span className='text-xs text-slate-500 dark:text-slate-400'>
              {d.name} {d.value}%
            </span>
          </div>
        ))}
      </div>

      <div className='flex-1 flex items-center justify-center'>
        <ResponsiveContainer width='100%' height={260}>
          <PieChart>
            <Pie
              data={donutData}
              cx='50%'
              cy='50%'
              innerRadius={65}
              outerRadius={100}
              paddingAngle={2}
              dataKey='value'
              startAngle={90}
              endAngle={-270}
            >
              {donutData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke='none' />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value}%`, '']}
              contentStyle={{
                borderRadius: '8px',
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                color: isDark ? '#f8fafc' : '#0f172a',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
