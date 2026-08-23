'use client'

import { useState, useEffect } from 'react'
import { useFetchAdminStats } from '@/hooks/admin/fetch-stats'

type StatCard = {
  label: string;
  value: number;
  accentColor: string;
}

function StatCard({ card, index }: { card: StatCard, index: number }) {

  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 100)
    return () => clearTimeout(t)
  }, [index])

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 transition-all duration-500
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-100 translate-y-4'}`}
    >
      <div className={`h-1 w-full ${card.accentColor}`} />
      <div className='flex flex-col gap-6 p-5'>
        <p className='text-sm text-slate-500 font-medium mb-2'>{card.label}</p>
        <p className='text-5xl font-bold tracking-tight mb-3 text-gray-800'>{card.value}</p>
      </div>
    </div>
  )
}

export default function AdminStats() {
  const { data: stats, isLoading  } = useFetchAdminStats()

  // ———— Data ————————————————————————————————————————

  const statCards: StatCard[] = [
    {
      label: 'Total Students',
      value: stats?.totalStudents ?? 0,
      accentColor: 'bg-[#0a1128]',
    },
    {
      label: 'Signed',
      value: stats?.signed ?? 0,
      accentColor: 'bg-emerald-600',
    },
    {
      label: 'Incomplete',
      value: stats?.incomplete ?? 0,
      accentColor: 'bg-amber-600',
    },
    {
      label: 'Pending',
      value: stats?.pending ?? 0,
      accentColor: 'bg-red-600',
    },
  ]

  if (isLoading) {
    return (
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='flex flex-col gap-8 justify-between bg-white rounded-xl border border-gray-200 p-6 shadow-xs'>
            <div className='h-4 w-24 bg-gray-200 rounded animate-pulse' />
            <div className='h-9 w-16 bg-gray-200 rounded animate-pulse' />
          </div>
        ))}
      </div>
    )
  }
  
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      {statCards.map((card, i) => (
        <StatCard key={card.label} card={card} index={i} />
      ))}
      {/* <div className='flex flex-col gap-8 justify-between bg-white rounded-xl border border-gray-300 p-6 shadow-xs'>
        <div className='text-base text-gray-600'>Total Students</div>
        <p className='text-4xl font-bold text-gray-700'>{stats?.totalStudents}</p>
      </div>

      <div className='flex flex-col gap-8 justify-between bg-emerald-50 rounded-xl border border-emerald-300 p-6 shadow-xs'>
        <div className='text-base text-emerald-600'>Signed</div>
        <p className='text-4xl font-bold text-emerald-500'>{stats?.signed}</p>
      </div>

      <div className='flex flex-col gap-8 justify-start bg-amber-50 rounded-xl border border-amber-300 p-6 shadow-xs'>
        <div className='text-base text-amber-600'>Incomplete</div>
        <p className='text-4xl font-bold text-amber-500'>{stats?.incomplete}</p>
      </div>

      <div className='flex flex-col gap-8 justify-between bg-red-50 rounded-xl border border-red-300 p-6 shadow-xs'>
        <div className='text-base text-red-600'>Pending</div>
        <p className='text-4xl font-bold text-red-500'>{stats?.pending}</p>
      </div> */}
    </div>
  )
}