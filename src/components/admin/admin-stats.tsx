'use client'

import { useFetchAdminStats } from '@/hooks/admin/fetch-stats'

type Props = {
  page: string
  setPage: (page: string) => void
}

export default function AdminStats({ page, setPage }: Props) {
  const { data: stats, isLoading  } = useFetchAdminStats()

  if (isLoading) {
    return <div>Loading stats...</div>
  }
  
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      <div className='flex flex-col gap-8 justify-between bg-white rounded-xl border border-gray-300 p-6 shadow-xs'>
        <div className='text-sm text-transform: uppercase text-gray-700 tracking-wider'>Total Students</div>
        <p className='text-4xl font-bold text-gray-700'>{stats?.totalStudents}</p>
      </div>

      <div className='flex flex-col gap-8 justify-between bg-emerald-50 rounded-xl border border-emerald-300 p-6 shadow-xs'>
        <div className='text-sm text-transform: uppercase text-emerald-700 tracking-wider'>Signed</div>
        <p className='text-4xl font-bold text-emerald-500'>{stats?.signed}</p>
      </div>

      <div 
        className='flex flex-col gap-8 justify-start bg-amber-50 rounded-xl border border-amber-300 p-6 shadow-xs transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-md cursor-pointer'
        onClick={() => setPage('student-stats-view')}
      >
        <div className='text-sm text-transform: uppercase text-amber-700 tracking-wider'>Incomplete</div>
        <p className='text-4xl font-bold text-amber-500'>{stats?.incomplete}</p>
      </div>

      <div 
        className='flex flex-col gap-8 justify-between bg-red-50 rounded-xl border border-red-300 p-6 shadow-xs transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-md cursor-pointer'
        onClick={() => setPage('student-stats-view')}
      >
        <div className='text-sm text-transform: uppercase text-red-700 tracking-wider'>Pending:</div>
        <p className='text-4xl font-bold text-red-500'>{stats?.pending}</p>
      </div>
    </div>
  )
}