'use client'

import { useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { useFetchStudentsList } from '@/hooks/admin/fetch-students-list'
import { useFetchCourses } from '@/hooks/admin/fetch-courses'

type Props = {
  setPage: (page: string) => void
}

const ITEMS_PER_PAGE = 25

export default function StudentsListView({ setPage }: Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCourse, setSelectedCourse] = useState('')

  const { data: courses } = useFetchCourses()
  const { data, isLoading } = useFetchStudentsList({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    course: selectedCourse,
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
      {/* Back button */}
      <button
        className='flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors'
        onClick={() => setPage('dashboard')}
      >
        <ArrowLeft className='w-4 h-4' /> Back to Dashboard
      </button>

      {/* Header */}
      <div>
        <h2 className='text-3xl font-bold text-gray-900 mb-2'>All Students</h2>
        <p className='text-sm text-gray-500'>
          View all enrolled students with their course, section, and clearance status.
        </p>
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
        {isLoading ? (
          <div className='flex items-center justify-center py-20'>
            <div className='text-gray-500'>Loading students...</div>
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
                    <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                      Student ID
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                      Name
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                      Course
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                      Section
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                      Clearance Status
                    </th>
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
