'use client'

import { useState, useEffect, useMemo, useDeferredValue } from 'react'
import { useFetchAdminStats } from '@/hooks/admin/fetch-stats'
import { useFetchStudentTemplates } from '@/hooks/admin/student-templates'
import { useFetchCourseTemplates } from '@/hooks/admin/course-templates'
import { StudentTemplates } from '@/types/admin'
import { expandCourseAbbreviation, shrinkCourseName } from '@/utils/formatters'
import { Search } from 'lucide-react'

import AdminStats from '@/components/admin/admin-stats'

// ———— TYPES ————————————————————————————————————————————————————————————————————————————————————————————————

type Props = {
  setAdminPage: (adminPage: string) => void
}

type TabType = 'all' | 'incomplete' | 'pending' | 'signed'

type SortType = 'name-a-z' | 'name-z-a'

// ———— CONSTANTS ————————————————————————————————————————————————————————————————————————————————————————————————

const PAGE_SIZE = 8

const STATUS_CONFIG: Record<'Incomplete' | 'Pending' | 'Signed', { container: string; text: string; dot: string }> = {
  Incomplete: { container: 'bg-amber-50 border-amber-200/80 dark:bg-amber-950/30 dark:border-amber-800/50', text: 'text-amber-800 dark:text-amber-300', dot: 'bg-amber-500' },
  Pending: { container: 'bg-rose-50 border-rose-200/80 dark:bg-rose-950/30 dark:border-rose-800/50', text: 'text-rose-800 dark:text-rose-300', dot: 'bg-rose-500' },
  Signed: { container: 'bg-emerald-50 border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-800/50', text: 'text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-500' },
};

// ———— SUB COMPONENTS ————————————————————————————————————————————————————————————————————————————————————————————————

function StatusBadge({ status }: { status: 'Incomplete' | 'Pending' | 'Signed' }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.Pending;
  return (
    <div className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 ${config.container}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <span className={`text-xs font-semibold ${config.text}`}>{status}</span>
    </div>
  );
}

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
    <div className='flex items-center gap-1.5'>
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className='px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer'
      >
        ← Prev
      </button>
      {total <= 5 && pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-lg text-xs font-bold cursor-pointer transition ${
            current === p
              ? 'bg-[#0B192C] text-white shadow-2xs dark:bg-amber-500 dark:text-slate-950'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          {p}
        </button>
      ))}
      {total > 5 && (
        <>
          <button
            onClick={() => onChange(1)}
            className={`w-8 h-8 rounded-lg text-xs font-bold cursor-pointer transition ${
              current === 1 ? 'bg-[#0B192C] text-white shadow-2xs dark:bg-amber-500 dark:text-slate-950' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            1
          </button>
          {current > 3 && <span className='text-slate-400 dark:text-slate-500 text-xs px-1'>...</span>}
          {pages
            .filter((p) => p !== 1 && p !== total && Math.abs(p - current) <= 1)
            .map((p) => (
              <button
                key={p}
                onClick={() => onChange(p)}
                className={`w-8 h-8 rounded-lg text-xs font-bold cursor-pointer transition ${
                  current === p
                    ? 'bg-[#0B192C] text-white shadow-2xs dark:bg-amber-500 dark:text-slate-950'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {p}
              </button>
            ))}
          {current < total - 2 && <span className='text-slate-400 dark:text-slate-500 text-xs px-1'>...</span>}
          <button
            onClick={() => onChange(total)}
            className={`w-8 h-8 rounded-lg text-xs font-bold cursor-pointer transition ${
              current === total ? 'bg-[#0B192C] text-white shadow-2xs dark:bg-amber-500 dark:text-slate-950' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {total}
          </button>
        </>
      )}
      <button
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        className='px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer'
      >
        Next →
      </button>
    </div>
  )
}

// ———— MAIN COMPONENT ————————————————————————————————————————————————————————————————————————————————————————————————

export default function StudentListView({ setAdminPage }: Props) {

  // State
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [courseFilter, setCourseFilter] = useState<string>('All')
  const [deptFilter, setDeptFilter] = useState<string>('All departments')
  const [sort, setSort] = useState<SortType>('name-a-z')
  const [studentPage, setStudentPage] = useState(1)

  // Hooks
  const { data: stats, isLoading: isLoadingAdminStats } = useFetchAdminStats()
  const { data: courseTemplates = [], isLoading: isLoadingCourseTemplates } = useFetchCourseTemplates()
  const { data: studentTemplates = [], isLoading: isLoadingStudentTemplates } = useFetchStudentTemplates()

  // ———— Data (Memoized) ————————————————————————————————————————

  const totalStudentTemplates = studentTemplates.length
  const incompleteCount = stats?.incomplete ?? 0
  const pendingCount = stats?.pending ?? 0
  const signedCount = stats?.signed ?? 0
  const courses = useMemo(() => courseTemplates.map(cT => shrinkCourseName(cT.course_name) || cT.course_name), [courseTemplates])
  const departments = useMemo(() => {
    const maxDeptNum = Math.max(0, ...courseTemplates.map(cT => cT.departments.length))
    const courseTemplate = courseTemplates.find(cT => cT.departments.length === maxDeptNum)
    return courseTemplate?.departments.map(d => d.dept_name) ?? []
  }, [courseTemplates])

  const filteredStudents = useMemo(() => {
    let data = studentTemplates

    if (activeTab === 'incomplete') { data = data.filter(s => s.overallStatus === 'Incomplete') }
    if (activeTab === 'pending') { data = data.filter(s => s.overallStatus === 'Pending') }
    if (activeTab === 'signed') { data = data.filter(s => s.overallStatus === 'Signed') }

    // search filter by student or course (deferred to keep typing non-blocking)
    if (deferredSearch.trim()) {
      const q = deferredSearch.trim().toLowerCase()

      data = data.filter(d => (
        d.student_name.toLowerCase().includes(q) ||
        d.course_name.toLowerCase().includes(q) ||
        shrinkCourseName(d.course_name).toLowerCase().includes(q) || 
        expandCourseAbbreviation(d.course_name).toLowerCase().includes(q) ||
        String(d.student_id).toLowerCase().includes(q)
      ))
    }

    // filter by course
    if (courseFilter.toLowerCase() !== 'all') {
      const cFilter = courseFilter.toLowerCase()
      data = data.filter(d => 
        shrinkCourseName(d.course_name).toLowerCase().includes(cFilter) || 
        d.course_name.toLowerCase().includes(cFilter)
      )
    }

    // filter by pending department
    if (deptFilter.toLowerCase() !== 'all departments') {
      const dFilter = deptFilter.toLowerCase()
      data = data.filter(d => 
        d.pending_departments.some(pD => pD.dept_name.toLowerCase() === dFilter)
      )
    }

    // sort without mutating original array
    return [...data].sort((a, b) => {
      if (sort === 'name-a-z') return a.student_name.localeCompare(b.student_name)
      if (sort === 'name-z-a') return b.student_name.localeCompare(a.student_name)
      return 0
    })
  }, [studentTemplates, activeTab, deferredSearch, courseFilter, deptFilter, sort])

  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE)
  const paginated = useMemo(() => 
    filteredStudents.slice((studentPage - 1) * PAGE_SIZE, studentPage * PAGE_SIZE),
    [filteredStudents, studentPage]
  )

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Student Clearance Registry
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Monitor individual clearance progression across degree programs, track bottlenecks, and review status.
        </p>
      </div>

      {/* KPI Stats Ribbon */}
      <AdminStats />

      {/* Registry Table & Filters Card */}
      <div className='bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden dark:bg-slate-900/90 dark:border-slate-800'>
        {/* Tab Strip */}
        <div className='flex border-b border-slate-200 overflow-x-auto bg-slate-50/50 dark:bg-slate-850 dark:border-slate-800'>
          {(
            [
              { key: 'all', label: 'All Students', count: totalStudentTemplates },
              { key: 'incomplete', label: 'Incomplete', count: incompleteCount },
              { key: 'pending', label: 'Pending Review', count: pendingCount },
              { key: 'signed', label: 'Fully Cleared', count: signedCount },
            ] as { key: TabType; label: string; count: number }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                activeTab === tab.key 
                  ? 'border-[#0B192C] text-[#0B192C] bg-white dark:border-amber-400 dark:text-amber-400 dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-bold tabular-nums ${
                  activeTab === tab.key
                    ? "bg-[#0B192C] text-white dark:bg-amber-400 dark:text-slate-950"
                    : "bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters Bar */}
        <div className='p-4 sm:p-5 flex flex-wrap gap-3 items-center justify-between border-b border-slate-200/80 bg-white dark:bg-slate-900 dark:border-slate-800'>
          {/* Search */}
          <div className='relative flex-1 min-w-[220px] max-w-sm'>
            <Search className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500' />
            <input 
              type='text'
              className='w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B192C]/10 focus:border-[#0B192C] placeholder:text-slate-400 transition-all text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 focus:dark:border-amber-400'
              placeholder='Search by student name, ID, or degree...'
              onChange={(e) => handleSearch(e.target.value)}
              value={search}
            />
          </div>

          <div className='flex flex-wrap items-center gap-2.5 ml-auto'>
            {/* Courses Filter Pills */}
            <div className='flex items-center gap-1 overflow-x-auto max-w-xs sm:max-w-none pb-1 sm:pb-0'>
              {['All', ...courses].map((c) => (
                <button
                  key={c}
                  onClick={() => handleCourseFilter(c)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    courseFilter === c
                      ? 'bg-[#0B192C] text-white shadow-2xs dark:bg-amber-500 dark:text-slate-950'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Department filter */}
            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setStudentPage(1); }}
              className='text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B192C]/10 focus:border-[#0B192C] cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 focus:dark:border-amber-400'
            >
              {['All departments', ...departments].map(d => (
                <option key={d} value={d} className="dark:bg-slate-800 dark:text-slate-200">{d}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value as SortType); setStudentPage(1) }}
              className='text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B192C]/10 focus:border-[#0B192C] cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 focus:dark:border-amber-400'
            >
              {([
                { label: 'Sort: Name (A-Z)', value: 'name-a-z' },
                { label: 'Sort: Name (Z-A)', value: 'name-z-a' }
              ] as { label: string; value: SortType}[]).map((o) => (
                <option key={o.value} value={o.value} className="dark:bg-slate-800 dark:text-slate-200">{o.label}</option>
              ))}
            </select>

            <span className="text-xs font-medium text-slate-400 dark:text-slate-400 whitespace-nowrap tabular-nums pl-1">
              {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
            </span>
          </div>
        </div>

        {/* Table - Desktop View */}
        <div className='hidden md:block overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-slate-200/90 bg-slate-50/70 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-800'>
                {['Student Name', 'Student ID', 'Degree Program', 'Status', 'Pending Offices'].map((h) => (
                  <th
                    key={h}
                    className='px-6 py-3.5 text-left text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400'
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100 dark:divide-slate-800'>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className='px-6 py-16 text-center text-sm text-slate-400 dark:text-slate-500'>
                    No students match your selected filters.
                  </td>
                </tr>
              ) : (
                paginated.map((s) => {
                  const courseAbbr = shrinkCourseName(s.course_name) || s.course_name;
                  const initials = s.student_name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={s.student_id} className='group hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors'>
                      <td className='px-6 py-4'>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0B192C] text-xs font-bold text-amber-400 shadow-2xs dark:bg-[#0B192C] dark:text-amber-400 dark:border dark:border-slate-700">
                            {initials}
                          </div>
                          <span className='font-bold text-slate-900 group-hover:text-amber-950 dark:text-slate-100 dark:group-hover:text-amber-400 transition-colors'>
                            {s.student_name}
                          </span>
                        </div>
                      </td>
                      <td className='px-6 py-4 font-mono text-xs text-slate-600 font-semibold'>
                        <span className='bg-slate-100 px-2 py-1 rounded-md border border-slate-200/80 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'>
                          {s.student_id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className='px-2.5 py-1 rounded-md text-xs font-bold border bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'>
                            {courseAbbr}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {s.course_year === 1 ? '1st Year' :
                             s.course_year === 2 ? '2nd Year' :
                             s.course_year === 3 ? '3rd Year' : `${s.course_year}th Year`}
                          </span>
                        </div>
                      </td>
                      <td className='px-6 py-4'>
                        <StatusBadge status={s.overallStatus} />
                      </td>
                      <td className='px-6 py-4'>
                        <div className='flex flex-wrap gap-1.5 max-w-sm'>
                          {s.pending_departments.length === 0 ? (
                            <span className='inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-300'>
                              <span className='h-1.5 w-1.5 rounded-full bg-emerald-500'></span>
                              All Cleared
                            </span>
                          ) : (
                            s.pending_departments.map((d) => (
                              <span 
                                key={d.dept_name}
                                className='inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200/80 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                              >
                                <span className='h-1.5 w-1.5 rounded-full bg-amber-500'></span>
                                {d.dept_name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className='md:hidden divide-y divide-slate-100 dark:divide-slate-800 dark:border-slate-800'>
          {paginated.length === 0 ? (
            <div className='px-6 py-16 text-center text-sm text-slate-400 dark:text-slate-500'>
              No students match your selected filters.
            </div>
          ) : (
            paginated.map((s) => {
              const initials = s.student_name
                .split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <div key={s.student_id} className='p-4 space-y-3 bg-white dark:bg-slate-900'>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2.5 min-w-0'>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0B192C] text-xs font-bold text-amber-400 dark:bg-[#0B192C] dark:text-amber-400 dark:border dark:border-slate-700">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className='text-sm font-bold text-slate-900 dark:text-slate-100 truncate'>{s.student_name}</p>
                        <p className='text-xs text-slate-500 dark:text-slate-400 font-mono'>{s.student_id}</p>
                      </div>
                    </div>
                    <StatusBadge status={s.overallStatus} />
                  </div>

                  <div className='flex items-center gap-2 text-xs'>
                    <span className='px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'>
                      {shrinkCourseName(s.course_name) || s.course_name}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      {s.course_year === 1 ? '1st Year' :
                       s.course_year === 2 ? '2nd Year' :
                       s.course_year === 3 ? '3rd Year' : `${s.course_year}th Year`}
                    </span>
                  </div>

                  {s.pending_departments.length > 0 ? (
                    <div className='pt-1'>
                      <span className='text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5'>
                        Pending Approvals
                      </span>
                      <div className='flex flex-wrap gap-1.5'>
                        {s.pending_departments.map((d) => (
                          <span 
                            key={d.dept_name}
                            className='inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-medium rounded-md border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                          >
                            <span className='h-1 w-1 rounded-full bg-amber-500'></span>
                            {d.dept_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className='pt-1'>
                      <span className='inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-300'>
                        <span className='h-1.5 w-1.5 rounded-full bg-emerald-500'></span>
                        All Cleared
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer & Pagination */}
        <div className='px-4 sm:px-6 py-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-400'>
          <span className='text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums'>
            Showing {paginated.length === 0 ? 0 : (studentPage - 1) * PAGE_SIZE + 1}-
            {Math.min(studentPage * PAGE_SIZE, filteredStudents.length)} of {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
          </span>
          <Pagination current={studentPage} total={totalPages} onChange={setStudentPage} />
        </div>
      </div>
    </div>
  )
}
