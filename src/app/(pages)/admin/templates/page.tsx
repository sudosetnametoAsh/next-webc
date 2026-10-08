'use client'

import { useEffect, useRef, useState } from 'react' 
import { useToast } from '@/components/admin/use-toast'
import { useFetchCourses } from '@/hooks/admin/courses'
import { useFetchDepartments } from '@/hooks/admin/departments'
import { ToastContainer } from '@/components/admin/toast'
import CourseTemplatesList from '@/components/admin/course-templates-list'
import StaffTemplatesList from '@/components/admin/staff-templates-list'
import CreateTemplateModal from '@/components/admin/create-template-modal'
import ManageDepartmentsModal from '@/components/admin/handle-department-modal'
import DeleteAllTemplateModal from '@/components/admin/delete-template-modal'
import ManageCoursesModal from "@/components/admin/handle-courses-modal"
import ManageHierarchyModal from "@/components/admin/handle-hierarchy-modal"
import { Plus, Building2, BookOpenText, Search, Trash, GitFork } from 'lucide-react'

export default function Templates() {

  // ————————————————————————————————————————
  // Core State
  // ————————————————————————————————————————

  const [searchQuery, setSearchQuery] = useState('')
  const [isStudentTemplateModalOpen, setStudentTemplateModalOpen] = useState(false)
  const [isStaffTemplateModalOpen, setStaffTemplateModalOpen] = useState(false)
  const [isCoursesModalOpen, setCoursesModalOpen] = useState(false)
  const [isDepartmentsModalOpen, setDepartmentsModalOpen] = useState(false)
  const [isHierarchyModalOpen, setHierarchyModalOpen] = useState(false)
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false)
  const [selectedCourses, setSelectedCourses] = useState<number[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([])

  // ————————————————————————————————————————
  // Hooks
  // ————————————————————————————————————————

  const { data: courses = [], isSuccess: isSucessCourses } = useFetchCourses()
  const { data: departments = [], isSuccess: isSuccessDepts } = useFetchDepartments()

  // ————————————————————————————————————————
  // Data
  // ————————————————————————————————————————
  
  const courseIds = courses.map(c => c.course_id)
  const deptIds = departments.map(d => d.dept_id)

  // ————————————————————————————————————————
  // Reference
  // ————————————————————————————————————————

  const initializedCourses = useRef(false)
  const initializedDepts = useRef(false)

  useEffect(() => {
    if (isSucessCourses && !initializedCourses.current) {
      setSelectedCourses(courseIds)
      initializedCourses.current = true
    }
  }, [isSucessCourses, courses])

  useEffect(() => {
    if (isSuccessDepts && !initializedDepts.current) {
      setSelectedDepartments(deptIds)
      initializedDepts.current = true
    }
  }, [isSuccessDepts, departments])

  // ————————————————————————————————————————
  // Toast Notification
  // ————————————————————————————————————————

  const { toasts, dismiss, success, error } = useToast({
    maxToasts: 3,
    duration: 4000,
  })

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} duration={4000} />

      <section>
        <div className='flex flex-col xl:flex-row gap-4 justify-between mb-8'>
          <div>
            <h2 className='text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100 mb-2'>Clearance Templates</h2>
            <p className='text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5'>Configure institutional clearance pipelines and department mappings</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Create Template button for students */}
            <button
              onClick={() => setStudentTemplateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0B192C] text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-[background-color,transform] duration-150 ease-out cursor-pointer shadow-xs dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950"
            >
              <Plus className="h-4 w-4 text-amber-400 dark:text-slate-950" />
              <span>Student Template</span>
            </button>

            {/* Create Template button for staff */}
            <button
              onClick={() => setStaffTemplateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0B192C] text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-[background-color,transform] duration-150 ease-out cursor-pointer shadow-xs dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-white"
            >
              <Plus className="h-4 w-4 text-emerald-400 dark:text-white" />
              <span>Staff Template</span>
            </button>

            {/* Management Utilities Group */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90">
              <button
                onClick={() => setCoursesModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 active:scale-95 transition-[background-color,color,transform] duration-150 ease-out cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <BookOpenText className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span>Courses</span>
              </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />
              <button
                onClick={() => setDepartmentsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 active:scale-95 transition-[background-color,color,transform] duration-150 ease-out cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Building2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span>Departments</span>
              </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />
              <button
                onClick={() => setHierarchyModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 active:scale-95 transition-[background-color,color,transform] duration-150 ease-out cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <GitFork className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                <span>Hierarchy</span>
              </button>
            </div>

            {/* Delete All button */}
            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl hover:bg-rose-50 active:scale-[0.98] transition-[background-color,border-color,transform] duration-150 ease-out cursor-pointer shadow-2xs dark:bg-slate-900/90 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/30"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className='flex items-center gap-4 mb-6'>
          <div className='flex-1 relative'>
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input 
              type='text'
              onChange={(e) => setSearchQuery(e.target.value)}
              value={searchQuery}
              maxLength={255}
              placeholder='Search course or staff templates...'
              className='w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B192C]/20 focus:border-[#0B192C] shadow-2xs transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 focus:dark:border-amber-400'
            />
          </div>
        </div>

        <StaffTemplatesList searchQuery={searchQuery} toastSuccess={success} toastError={error} />
        <CourseTemplatesList searchQuery={searchQuery} toastSuccess={success} toastError={error} />
      </section>

      <CreateTemplateModal
        mode={"student"}
        open={isStudentTemplateModalOpen} 
        onOpenChange={setStudentTemplateModalOpen}
        selectedCourses={selectedCourses}
        setSelectedCourses={setSelectedCourses}
        selectedDepartments={selectedDepartments}
        setSelectedDepartments={setSelectedDepartments}
        courses={courses}
        departments={departments}
        courseIds={courseIds}
        deptIds={deptIds}
        toastSuccess={success} 
        toastError={error} />
      
      <CreateTemplateModal
        mode={"staff"}
        open={isStaffTemplateModalOpen} 
        onOpenChange={setStaffTemplateModalOpen}
        selectedCourses={selectedCourses}
        setSelectedCourses={setSelectedCourses}
        selectedDepartments={selectedDepartments}
        setSelectedDepartments={setSelectedDepartments}
        courses={courses}
        departments={departments}
        courseIds={courseIds}
        deptIds={deptIds}
        toastSuccess={success} 
        toastError={error} />

      <ManageCoursesModal 
        open={isCoursesModalOpen}
        onOpenChange={setCoursesModalOpen}
        setSelectedCourses={setSelectedCourses}
        courseIds={courseIds}
        toastSuccess={success}
        toastError={error} />

      <ManageDepartmentsModal
        open={isDepartmentsModalOpen}
        onOpenChange={setDepartmentsModalOpen}
        setSelectedDepartments={setSelectedDepartments}
        deptIds={deptIds}
        toastSuccess={success}
        toastError={error} />

      <ManageHierarchyModal
        open={isHierarchyModalOpen}
        onOpenChange={setHierarchyModalOpen} />

      <DeleteAllTemplateModal 
        open={isDeleteAllModalOpen}
        onOpenChange={setIsDeleteAllModalOpen}
        toastSuccess={success}
        toastError={error} />
    </>
  )
}
