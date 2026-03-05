import { useState } from 'react'
import { useFetchAdminStats } from '@/hooks/admin/fetch-stats'
import { useFetchStudentTemplates } from '@/hooks/admin/student-templates'

type Props = {
  setAdminPage: (adminPage: string) => void
}

type TabType = 'all' | 'incomplete' | 'pending'

export default function StudentClearanceStatus({ setAdminPage }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [studentPage, setStudentPage] = useState(1)

  const { data: stats, isLoading } = useFetchAdminStats()
  const { data: studentTemplates, } = useFetchStudentTemplates()

  const totalNonCleared = studentTemplates?.length
  const incompleteCount = stats?.incomplete
  const pendingCount = stats?.pending

  const filteredStudents = studentTemplates?.filter(s => {
    if (activeTab === 'incomplete') { return s.overallStatus === 'Incomplete' }
    if (activeTab === 'pending') { return s.overallStatus === 'Pending' }
    return studentTemplates
  })

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setStudentPage(1)
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <>
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3 font-medium tracking-wide uppercase">
          <span
            className='cursor-pointer' 
            onClick={() => setAdminPage('dashboard')}
          >Dashboard</span>
          <span>›</span>
          <span className="text-gray-600">Students</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-2">
          Student Clearance Status
        </h1>
        <p className="text-sm text-gray-500">
          Track and manage students who haven't completed their clearance.
        </p>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <div className='flex flex-col gap-4 justify-between bg-indigo-50 rounded-xl border border-indigo-200 p-6 shadow-xs'>
          <div className='text-base text-indigo-600'>Total Non-Cleared</div>
          <p className='text-4xl font-bold text-indigo-500'>{stats?.totalNonCleared}</p>
          <p className='text-sm text-gray-500'>students</p>
        </div>

        <div className='flex flex-col gap-4 justify-between bg-amber-50 rounded-xl border border-amber-200 p-6 shadow-xs'>
          <div className='text-base text-amber-600 font-small'>Incomplete</div>
          <p className='text-4xl font-bold text-amber-500'>{stats?.incomplete}</p>
          <p className='text-sm text-gray-500'>partially cleared</p>
        </div>

        <div className='flex flex-col gap-4 justify-between bg-red-50 rounded-xl border border-red-200 p-6 shadow-xs'>
          <div className='text-base text-red-600 font-small'>Pending</div>
          <p className='text-4xl font-bold text-red-500'>{stats?.pending}</p>
          <p className='text-sm text-gray-500'>zero progress</p>
        </div>

        <div className='flex flex-col gap-4 justify-between bg-cyan-50 rounded-xl border border-cyan-200 p-6 shadow-xs'>
          <div className='text-base text-cyan-600 font-small'>Avg. Completion</div>
          <p className='text-4xl font-bold text-cyan-500'>{stats?.averageCompletion}%</p>
          <p className='text-sm text-gray-500'>across all students</p>
        </div>
      </div>

      {/* Table Card */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>
        {/* Tabs */}
        <div className='flex'>
          {(
            [
              { key: 'all', label: 'All Students', count: totalNonCleared },
              { key: 'incomplete', label: 'Incomplete', count: incompleteCount },
              { key: 'pending', label: 'Pending', count: pendingCount },
            ] as { key: TabType; label: string; count: number }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-5 py-4 text-sm font-semibold flex items-center gap-2 whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.key 
                  ? 'border-gray-900 text-gray-900 bg-gray-900/[0.03]'
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span
                  className={`text-sm px-2 py-0.5 rounded-full font-bold ${
                    activeTab === tab.key
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tab.count}
                </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        {/* <div className='flex flex-wrap gap-3 items-center border-b border-gray-50'></div> */}
        <div className='overflow-y-auto h-192 px-4 sm:px-6 py-4'>

          {/* Table - desktop */}
          <table className='w-full'>
            <thead>
              <tr className='border-b border-gray-50'>
                {['Student', 'ID', 'Course / Year', 'Status', 'Pending Departments'].map((h) => (
                  <th
                    key={h}
                    className='px-6 py-3 text-left text-[12px] font-semibold tracking-widest uppercase text-gray-500'
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-50'>
                {filteredStudents?.map((s) => (
                  <tr key={s.student_id} className='hover:bg-gray-50/60 transition-colors'>
                    <td className='px-6 py-4'>
                      <span className='font-semibold text-gray-800'>{s.student_name}</span>
                    </td>
                    <td className='px-6 py-4 text-gray-500'>{s.student_id}</td>
                    <td className="px-6 py-4">
                        <span className="text-base font-semibold text-gray-700">{s.course_name}</span>
                        <br />
                        <span className="text-sm text-gray-400">
                          {s.course_year === 1 ? (
                            `${s.course_year}st Year`
                          ) : s.course_year === 2 ? (
                            `${s.course_year}nd Year`
                          ) : s.course_year === 3 ? (
                            `${s.course_year}rd Year`
                          ) : `${s.course_year}th Year`}
                        </span>
                      </td>
                      <td className='px-6 py-4'>{s.overallStatus}</td>
                      <td className='px-6 py-4'>
                        <div className='flex flex-wrap gap-1.5 max-w-xs'>
                          {s.pending_departments.map((d) => (
                            <span 
                              key={d.dept_name}
                              className='p-2 bg-gray-100 text-gray-700 rounded-lg border-gray-200 text-sm'
                            >
                                {d.dept_name}
                            </span>
                          ))}
                        </div>
                      </td>
                  </tr>
                ))}
            </tbody>
          </table>
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