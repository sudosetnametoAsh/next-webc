import { useState } from 'react'

import { ArrowLeft, Search } from 'lucide-react'
import { useFetchAdminStats } from '@/hooks/admin/fetch-stats'

type Props = {
  page: string
  setPage: (page: string) => void
}

export default function StudentStatsView({ page, setPage}: Props) {
  const { data: stats, isLoading } = useFetchAdminStats()

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <>
      <button
        className='flex items-center gap-2 text-sm text-gray-600 cursor-pointer'
        onClick={() => setPage('dashboard')}
      >
        <ArrowLeft className='w-4 h-4' /> Back to Dashboard
      </button>

      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Student Clearance Status</h2>
        <p className="text-sm text-gray-500">Track students who have not completed their clearance.</p>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <div className='flex flex-col gap-4 justify-between bg-indigo-50 rounded-xl border border-indigo-200 p-6 shadow-xs'>
          <div className='text-sm text-transform: uppercase text-indigo-600 tracking-wider'>Total Non-Cleared</div>
          <p className='text-4xl font-bold text-indigo-500'>{stats?.totalNonCleared}</p>
          <p className='text-sm text-gray-500'>students</p>
        </div>

        <div className='flex flex-col gap-4 justify-between bg-amber-50 rounded-xl border border-amber-200 p-6 shadow-xs'>
          <div className='text-sm text-transform: uppercase text-amber-600 font-small tracking-wider'>Incomplete</div>
          <p className='text-4xl font-bold text-amber-500'>{stats?.incomplete}</p>
          <p className='text-sm text-gray-500'>partially cleared</p>
        </div>

        <div className='flex flex-col gap-4 justify-between bg-red-50 rounded-xl border border-red-200 p-6 shadow-xs'>
          <div className='text-sm text-transform: uppercase text-red-600 font-small tracking-wider'>Pending</div>
          <p className='text-4xl font-bold text-red-500'>{stats?.pending}</p>
          <p className='text-sm text-gray-500'>zero progress</p>
        </div>

        <div className='flex flex-col gap-4 justify-between bg-cyan-50 rounded-xl border border-cyan-200 p-6 shadow-xs'>
          <div className='text-sm text-transform: uppercase text-cyan-600 font-small tracking-wider'>Avg. Completion</div>
          <p className='text-4xl font-bold text-cyan-500'>{stats?.averageCompletion}%</p>
          <p className='text-sm text-gray-500'>across all students</p>
        </div>
      </div>

      {/* Search & Filter section */}
      {/* <div className='flex items-center gap-2 bg-white rounded-lg border-1 border-gray-200 shadow-xs p-4'>
        <div className='relative'>
          <Search className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
          <input
            type='text'
            onChange={(e) => console.log(e.target.value)}
            placeholder='Search by student name or by student ID...'
            className='w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent'
          />
        </div>
        <button
          className='p-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer  '
        >
          All
        </button>
        <button
          className='p-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer  '
        >
          BSCS
        </button>
        <button
          className='p-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer  '
        >
          BSIT
        </button>
        <button
          className='p-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer  '
        >
          BSTM
        </button>
      </div> */}
    </>
  )
}