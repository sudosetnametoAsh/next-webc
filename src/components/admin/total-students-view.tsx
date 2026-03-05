import { useState, useEffect } from 'react'

import { ArrowLeft, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useFetchAdminStats } from '@/hooks/admin/fetch-stats'
import { useFetchStudentsList } from '@/hooks/admin/fetch-students-list'
import { useFetchCourses } from '@/hooks/admin/fetch-courses'

type Props = {
  page: string
  setPage: (page: string) => void
}

const ITEMS_PER_PAGE = 25

export default function TotalStudentsView({ page, setPage }: Props) {
  const { data: stats, isLoading: statsLoading } = useFetchAdminStats()

  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCourse, setSelectedCourse] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: courses } = useFetchCourses()
  const { data, isLoading: listLoading } = useFetchStudentsList({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    course: selectedCourse,
    search: debouncedSearch,
  })

  const handleCourseFilter = (courseName: string) => {
    setSelectedCourse(courseName)
    setCurrentPage(1)
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'Cleared':
        return (
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700'>
            Cleared
          </span>
        )
      case 'Incomplete':
        return (
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700'>
            Incomplete
          </span>
        )
      case 'Pending':
        return (
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700'>
            Pending
          </span>
        )
      default:
        return (
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700'>
            {status}
          </span>
        )
    }
  }

  return (
    <>
      <button
        className='flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors'
        onClick={() => setPage('dashboard')}
      >
        <ArrowLeft className='w-4 h-4' /> Back to Dashboard
      </button>

      <div>
        <h2 className='text-3xl font-bold text-gray-900 mb-2'>Student Clearance Status</h2>
        <p className='text-sm text-gray-500'>Track students who have not completed their clearance.</p>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='bg-gray-100 rounded-xl border border-gray-200 p-6 shadow-xs animate-pulse h-32' />
          ))}
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          <div className='flex flex-col gap-4 justify-between bg-indigo-50 rounded-xl border border-indigo-200 p-6 shadow-xs'>
            <div className='text-base text-indigo-600'>Total Non-Cleared</div>
            <p className='text-4xl font-bold text-indigo-500'>{stats?.totalNonCleared}</p>
            <p className='text-sm text-gray-500'>students</p>
          </div>

          <div className='flex flex-col gap-4 justify-between bg-amber-50 rounded-xl border border-amber-200 p-6 shadow-xs'>
            <div className='text-base text-amber-600'>Incomplete</div>
            <p className='text-4xl font-bold text-amber-500'>{stats?.incomplete}</p>
            <p className='text-sm text-gray-500'>partially cleared</p>
          </div>

          <div className='flex flex-col gap-4 justify-between bg-red-50 rounded-xl border border-red-200 p-6 shadow-xs'>
            <div className='text-base text-red-600'>Pending</div>
            <p className='text-4xl font-bold text-red-500'>{stats?.pending}</p>
            <p className='text-sm text-gray-500'>zero progress</p>
          </div>

          <div className='flex flex-col gap-4 justify-between bg-cyan-50 rounded-xl border border-cyan-200 p-6 shadow-xs'>
            <div className='text-base text-cyan-600'>Avg. Completion</div>
            <p className='text-4xl font-bold text-cyan-500'>{stats?.averageCompletion}%</p>
            <p className='text-sm text-gray-500'>across all students</p>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className='relative max-w-md'>
        <Search className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
        <input
          type='text'
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder='Search by student name or ID...'
          className='w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-shadow'
        />
      </div>

      {/* Course filter buttons */}
      <div className='flex flex-wrap items-center gap-2'>
        <button
          onClick={() => handleCourseFilter('')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
            selectedCourse === ''
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          All Courses
        </button>
        {courses?.map((course) => (
          <button
            key={course.course_id}
            onClick={() => handleCourseFilter(course.course_name)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              selectedCourse === course.course_name
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {course.course_name}
          </button>
        ))}
      </div>

      {/* Student table */}
      <div className='bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden'>
        {listLoading ? (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>Student ID</th>
                  <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>Name</th>
                  <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>Course</th>
                  <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>Section</th>
                  <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>Clearance Status</th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td className='px-6 py-4'><div className='h-4 w-20 bg-gray-200 rounded animate-pulse' /></td>
                    <td className='px-6 py-4'><div className='h-4 w-32 bg-gray-200 rounded animate-pulse' /></td>
                    <td className='px-6 py-4'><div className='h-4 w-16 bg-gray-200 rounded animate-pulse' /></td>
                    <td className='px-6 py-4'><div className='h-4 w-12 bg-gray-200 rounded animate-pulse' /></td>
                    <td className='px-6 py-4'><div className='h-5 w-20 bg-gray-200 rounded-full animate-pulse' /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !data || data.students.length === 0 ? (
          <div className='flex items-center justify-center py-20'>
            <div className='text-gray-400'>No students found.</div>
          </div>
        ) : (
          <>
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>Student ID</th>
                    <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>Name</th>
                    <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>Course</th>
                    <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>Section</th>
                    <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>Clearance Status</th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {data.students.map((student, index) => (
                    <tr
                      key={`${student.student_id}-${index}`}
                      className='hover:bg-gray-50 transition-colors'
                    >
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono'>
                        {student.student_id}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium'>
                        {student.student_name}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600'>
                        {student.course_name}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600'>
                        {student.section}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        {statusBadge(student.clearance_status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className='flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3'>
              <div className='text-sm text-gray-500'>
                Showing{' '}
                <span className='font-medium'>{(data.page - 1) * data.limit + 1}</span>
                {' '}-{' '}
                <span className='font-medium'>
                  {Math.min(data.page * data.limit, data.total)}
                </span>
                {' '}of{' '}
                <span className='font-medium'>{data.total}</span> students
              </div>

              <div className='flex items-center gap-2'>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className='inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors'
                >
                  <ChevronLeft className='w-4 h-4' />
                  Prev
                </button>

                <span className='text-sm text-gray-600 px-2'>
                  Page {data.page} of {data.totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={currentPage >= data.totalPages}
                  className='inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors'
                >
                  Next
                  <ChevronRight className='w-4 h-4' />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}