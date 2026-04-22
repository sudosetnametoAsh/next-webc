'use client'

import { useState } from 'react'
import { useFetchAdminStats } from '@/hooks/admin/fetch-stats'
import { useFetchStudentTemplates } from '@/hooks/admin/student-templates'
import { useFetchCourseTemplates } from '@/hooks/admin/course-templates'
import { StudentTemplates } from '@/types/admin'
import { expandCourseAbbreviation, shrinkCourseName } from '@/utils/formatters'
import { Search } from 'lucide-react'


type Props = {
  setAdminPage: (adminPage: string) => void
}

type TabType = 'all' | 'incomplete' | 'pending' | 'signed'

type SortType = 'name-a-z' | 'name-z-a'


const PAGE_SIZE = 8


function Pagination({
  current,
  total,
  onChange
}: {
  current: number;
  total: number;
  onChange: (page: number) => void;
}) {

  const pages = Array.from({ length: total }, (_, i) => i + 1 )
  if (total <= 1) { return null }

  return (
    <div className='flex items-center gap-2'>
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className='px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer'
      >
        ← Prev
      </button>
      {total < 4 && pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-lg text-sm font-medium cursor-pointer ${
            current === p
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {p}
        </button>
      ))}
      {(current < 3 && total > 3) && pages.slice(0, 3).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-lg text-sm font-medium cursor-pointer ${
            current === p
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {p}
        </button>
      ))}
      {(current > 2 && current < total - 2 && total > 3) && pages.slice(current - 2, current + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-lg text-sm font-medium cursor-pointer ${
            current === p
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {p}
        </button>
      ))}
      {(current < total - 2 && total > 3) && (
        <>
          <span className='text-gray-400 text-sm px-1'>...</span>
          {pages.slice(total - 1).map((p) => (<button
            key={p}
            onClick={() => onChange(p)}
            className={`w-8 h-8 rounded-lg text-sm font-medium cursor-pointer ${
              current === p
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>))}
        </>
      )}
      {(current >= total - 2 && total > 3) && pages.slice(total - 4, total).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-lg text-sm font-medium cursor-pointer ${
            current === p
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        className='px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer'
      >
        Next →
      </button>
    </div>
  )
}


export default function StudentListView({ setAdminPage }: Props) {

  // State
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState<string>('All')
  const [deptFilter, setDeptFilter] = useState<string>('All departments')
  const [sort, setSort] = useState<SortType>('name-a-z')
  const [studentPage, setStudentPage] = useState(1)

  // Hooks
  const { data: stats, isLoading } = useFetchAdminStats()
  const { data: courseTemplates } = useFetchCourseTemplates()
  const { data: studentTemplates, } = useFetchStudentTemplates()

  const totalStudentTemplates = studentTemplates?.length
  const incompleteCount = stats?.incomplete
  const pendingCount = stats?.pending
  const signedCount = stats?.signed
  const courses = courseTemplates?.map(cT => shrinkCourseName(cT.course_name) || cT.course_name)
  const maxDeptNum = Math.max(...courseTemplates?.map(cT => cT.departments.length) ?? [])
  const courseTemplate = courseTemplates?.filter(cT => cT.departments.length === maxDeptNum)[0]
  const departments = courseTemplate?.departments.map(d => d.dept_name)


  const getFilteredStudents = (students: StudentTemplates[]) => {

    let data = students

    if (activeTab === 'incomplete') { data = data.filter(s => s.overallStatus === 'Incomplete') }
    if (activeTab === 'pending') { data = data.filter(s => s.overallStatus === 'Pending') }
    if (activeTab === 'signed') { data = data.filter(s => s.overallStatus === 'Signed') }

    // search filter by student or course
    if (search.trim()) {
      const q = search.trim().toLowerCase()

      data = data.filter(d => (
        d.student_name.toLowerCase().includes(q) ||
        d.course_name.toLowerCase().includes(q) ||
        shrinkCourseName(d.course_name).toLowerCase().includes(q) || 
        expandCourseAbbreviation(d.course_name).toLowerCase().includes(q)
      ))
    }

    // filter by course
    data = data?.filter(d => 
      courseFilter.toLowerCase() === 'all' ||
      shrinkCourseName(d.course_name).toLowerCase().includes(courseFilter.toLowerCase()) || 
      d.course_name.toLowerCase().includes(courseFilter.toLowerCase())
    )

    // filter by pending department
    data = data.filter(d => (
      deptFilter.toLowerCase() === 'all departments' ||
      d.pending_departments.map(pD => pD.dept_name.toLowerCase()).includes(deptFilter.toLowerCase())
    ))

    // sort
    data = sort === 'name-a-z' 
      ? data.sort((a, b) => a.student_name.localeCompare(b.student_name))
      : sort === 'name-z-a' 
        ? data.sort((a, b) => b.student_name.localeCompare(a.student_name))
        : data

    return data ?? []
  }

  const filteredStudents = getFilteredStudents(studentTemplates ?? [])

  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE)
  const paginated = filteredStudents.slice((studentPage - 1) * PAGE_SIZE, studentPage * PAGE_SIZE)


  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setStudentPage(1)
  }

  const handleSearch = (searchQuery: string) => {
    setSearch(searchQuery)
    setStudentPage(1)
  }

  const handleCourseFilter = (course: string) => {
    setCourseFilter(course)
    setStudentPage(1)
  }

  if (isLoading) {
    return <div>Loading...</div>
  }


  return (
    <>
      <div>
        {/* Breadcrumb */}
        {/* <div className="flex items-center gap-2 text-xs text-gray-400 mb-3 font-medium tracking-wide uppercase">
          <span
            className='cursor-pointer' 
            onClick={() => setAdminPage('dashboard')}
          >Dashboard</span>
          <span>›</span>
          <span className="text-gray-600">Students</span>
        </div> */}
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
              { key: 'all', label: 'All Students', count: totalStudentTemplates },
              { key: 'incomplete', label: 'Incomplete', count: incompleteCount },
              { key: 'pending', label: 'Pending', count: pendingCount },
              { key: 'signed', label: 'Signed', count: signedCount },
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
        <div className='px-4 sm:px-6 py-4 flex flex-wrap gap-3 item-center border-b border-gray-500'>

          {/* Search */}
          <div className='relative flex-1 min-w-[200px] max-w-xs'>
            <Search className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300' />
            <input 
              type='text'
              className='w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder:text-gray-300'
              placeholder='Search by name, ID, or course...'
              onChange={(e) => handleSearch(e.target.value)}
              value={search}
            />
          </div>

          {/* Courses */}
          <div className='flex items-center gap-1.5 flex-wrap'>
            {['All', ...courses ?? ''].map((c) => (
              <button
                key={c}
                onClick={() => handleCourseFilter(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  courseFilter === c
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Deparment filter */}
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setStudentPage(1); }}
            className='text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900/10 cursor-pointer'

          >
            {['All departments', ...departments ?? ''].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as SortType); setStudentPage(1) }}
            className='text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900/10 cursor-pointer'
          >
            {([
              { label: 'Sort: Name A-Z', value: 'name-a-z' },
              { label: 'Sort: Name Z-A', value: 'name-z-a' }
            ] as { label: string; value: SortType}[]).map((o) => (
              <option key={o.value} value={o.value} >{o.label}</option>
            ))}
          </select>

          <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
              {filteredStudents.length}
              {(filteredStudents.length ?? 0) > 1 ? ' results' : ' result'}
          </span>
        </div>

        {/* Table - desktop */}
        <div className='hidden md:block overflow-x-auto'>
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
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='px-6 py-16 text-center text-sm text-gray-400'>
                      No students match your filters.
                    </td>
                  </tr>
                ) : (
                  paginated?.map((s) => (
                    <tr key={s.student_id} className='hover:bg-gray-50/60 transition-colors'>
                      <td className='px-6 py-4'>
                        <span className='font-semibold text-gray-800'>{s.student_name}</span>
                      </td>
                      <td className='px-6 py-4 text-gray-500'>{s.student_id}</td>
                      <td className="px-6 py-4">
                          <span className="text-base font-semibold text-gray-700">{shrinkCourseName(s.course_name) || s.course_name}</span>
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
                  )))}
            </tbody>
          </table>
        </div>

        {/* Mobile view */}
        <div className='md:hidden divide-y divide-gray-50'>
            {paginated.length === 0 ? (
              <div className='px-6 py-16 text-center text-sm text-gray-400'>
                No students match you filters.
              </div>
            ) : (paginated.map((s) => (
              <div key={s.student_id} className='px-4 py-4 space-y-3'>
                <div className='flex items-center justify-between gap-2"'>
                  {/* <div className='flex items-center gap-3'>
                    <Avatar />
                  </div> */}
                  <div className='flex items-center gap-3'>
                    <p className='text-base font-semibold text-gray-800'>{s.student_name}</p>
                    <p className='text-sm text-gray-500 font-mono'>{s.student_id}</p>
                  </div>
                </div>
                <p className='text-sm mb-3'>{s.overallStatus}</p>
                <div className='flex items-center gap-4 text-xs text-gray-500'>
                  <span className='text-sm font-semibold'>{shrinkCourseName(s.course_name) || s.course_name}</span>
                  <span className="text-xs text-gray-400">
                    {s.course_year === 1 ? (
                      `${s.course_year}st Year`
                    ) : s.course_year === 2 ? (
                      `${s.course_year}nd Year`
                    ) : s.course_year === 3 ? (
                      `${s.course_year}rd Year`
                    ) : `${s.course_year}th Year`}
                  </span>
                </div>
                {s.pending_departments.length > 0 && (
                  <div className='flex flex-wrap gap-1.5'>
                    {s.pending_departments.map((d) => (
                      <span 
                        key={d.dept_name}
                        className='p-2 bg-gray-100 text-gray-700 rounded-lg border-gray-200 text-xs'
                      >
                          {d.dept_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )))}
        </div>

        <div className='px-4 sm:px-6 py-4 border-t border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3'>
            <span className='text-gray-500'>
              Showing {paginated.length === 0 ? 0 : (studentPage - 1) * PAGE_SIZE + 1}-
              {Math.min(studentPage * PAGE_SIZE, filteredStudents.length)} of {paginated.length} {paginated.length > 1 ? 'students' : 'student'}
            </span>
            <Pagination current={studentPage} total={totalPages} onChange={setStudentPage} />
        </div>
      </div>
    </>
  )
}