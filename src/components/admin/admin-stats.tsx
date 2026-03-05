'use client'

import { useFetchAdminStats } from '@/hooks/admin/fetch-stats'
import { useFetchStudentTemplates } from '@/hooks/admin/student-templates' // delete later

type Props = {
  page: string
  setPage: (page: string) => void
}

export default function AdminStats({ page, setPage }: Props) {
  const { data: stats, isLoading  } = useFetchAdminStats()
  const { data } = useFetchStudentTemplates() // delete later

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
      <div className='flex flex-col gap-8 justify-between bg-white rounded-xl border border-gray-300 p-6 shadow-xs cursor-pointer hover transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-md'>
        <div className='text-base text-gray-600'>Total Students</div>
        <p className='text-4xl font-bold text-gray-700' onClick={() => setPage('overall-students-view')}>
          {stats?.totalStudents}
        </p>
      </div>

      <div className='flex flex-col gap-8 justify-between bg-emerald-50 rounded-xl border border-emerald-300 p-6 shadow-xs'>
        <div className='text-base text-emerald-600'>Signed</div>
        <p className='text-4xl font-bold text-emerald-500'>{stats?.signed}</p>
      </div>

      <div 
        className='flex flex-col gap-8 justify-start bg-amber-50 rounded-xl border border-amber-300 p-6 shadow-xs transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-md cursor-pointer'
        onClick={() => setPage('student-stats-view')}
      >
        <div className='text-base text-amber-600'>Incomplete</div>
        <p className='text-4xl font-bold text-amber-500'>{stats?.incomplete}</p>
      </div>

      <div 
        className='flex flex-col gap-8 justify-between bg-red-50 rounded-xl border border-red-300 p-6 shadow-xs transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-md cursor-pointer'
        onClick={() => setPage('student-stats-view')}
      >
        <div className='text-base text-red-600'>Pending</div>
        <p className='text-4xl font-bold text-red-500'>{stats?.pending}</p>
      </div>
    </div>
  )
}