'use client'

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

  const clearedPercent = Math.round(((adminStats?.signed ?? 0) / (studentTemplates.length || 1)) * 100)
  const inProgressPercent = Math.round(((adminStats?.incomplete ?? 0) / (studentTemplates.length || 1)) * 100)
  const pendingPercent = Math.round(((adminStats?.pending ?? 0) / (studentTemplates.length || 1)) * 100)

  const donutData: DonutEntry[] = [
    { name: "Cleared", value: clearedPercent, color: "#009966" },
    { name: "In progress", value: inProgressPercent, color: '#f54900' },
    { name: "Pending", value: pendingPercent, color: "#e7000b" },
  ]

  return (
    <div className='bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col'>
      <h2 className='text-base font-bold text-slate-800'>Overall clearance status</h2>
      <p className='text-xs text-slate-400 mt-0.5 mb-4'>All students combined</p>

      {/* Legend */}
      <div className='flex flex-wrap gap-4 mb-4'>
        {donutData.map((d) => (
          <div key={d.name} className='flex items-center gap-1.5'>
            <span className='w-2.5 h-2.5 rounded-full inline-block' style={{ background: d.color }} />
            <span className='text-xs text-slate-500'>
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
                border: '1px solid #e2e8f0',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
