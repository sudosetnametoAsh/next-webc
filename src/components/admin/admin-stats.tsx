'use client'

import { useFetchAdminStats } from '@/hooks/admin/fetch-stats'

export default function AdminStats() {
  const { data: stats, isLoading  } = useFetchAdminStats()

  if (isLoading) {
    return <div>Loading stats...</div>
  }
  
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      <div className='flex flex-col gap-12 justify-between bg-white border-gray-200 rounded-xl border-2 p-6 shadow-xs'>
        <div className='text-sm text-gray-900 font-bold'>Total Students:</div>
        <p className='text-4xl font-bold text-gray-900'>{stats?.totalStudents}</p>
      </div>

      <div className='flex flex-col gap-12 justify-between bg-emerald-50 border-emerald-200 rounded-xl border-2 p-6 shadow-xs'>
        <div className='text-sm text-emerald-500 font-medium'>Signed:</div>
        <p className='text-4xl font-bold text-emerald-500'>{stats?.signed}</p>
      </div>

      <div className='flex flex-col gap-12 justify-between bg-amber-50 border-amber-200 rounded-xl border-2 p-6 shadow-xs'>
        <div className='text-sm text-amber-500 font-bold'>Incomplete:</div>
        <p className='text-4xl font-bold text-amber-500'>{stats?.incomplete}</p>
      </div>

      <div className='flex flex-col gap-12 justify-between bg-white border-gray-200 rounded-xl border-2 p-6 shadow-xs'>
        <div className='text-sm text-gray-900 font-bold'>Pending:</div>
        <p className='text-4xl font-bold text-gray-900'>{stats?.pending}</p>
      </div>
    </div>
  )
}