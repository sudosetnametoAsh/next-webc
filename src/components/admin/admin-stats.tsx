'use client'

import { useFetchAdminStats } from '@/hooks/admin/fetch-stats'

export default function AdminStats() {
  const { data: stats, isLoading  } = useFetchAdminStats()

  if (isLoading) {
    return <div>Loading stats...</div>
  }
  
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      <div className='flex flex-col gap-4 bg-white border-gray-200 rounded-xl border p-5'>
        <div className='text-sm text-gray-500 font-bold'>Total Students:</div>
        <p className='text-3xl font-bold text-gray-900'>{stats?.totalStudents}</p>
      </div>

      <div className='flex flex-col gap-4 bg-green-50 border-gray-200 rounded-xl border p-5'>
        <div className='text-sm text-gray-500 font-bold'>Signed:</div>
        <p className='text-3xl font-bold text-green-700'>{stats?.signed}</p>
      </div>

      <div className='flex flex-col gap-4 bg-amber-50 border-gray-200 rounded-xl border p-5'>
        <div className='text-sm text-gray-500 font-bold'>Incomplete:</div>
        <p className='text-3xl font-bold text-amber-700'>{stats?.incomplete}</p>
      </div>

      <div className='flex flex-col gap-4 bg-white border-gray-200 rounded-xl border p-5'>
        <div className='text-sm text-gray-500 font-bold'>Pending:</div>
        <p className='text-3xl font-bold text-gray-900'>{stats?.pending}</p>
      </div>
    </div>
  )
}