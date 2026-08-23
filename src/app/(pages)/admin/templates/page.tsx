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
            <h2 className='text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 mb-2'>Clearance Templates</h2>
            <p className='text-sm text-gray-600'>Manage clearance templates for students and staff</p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Create Template button for students */}
            <button
              onClick={() => setStudentTemplateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create student templates
            </button>

            {/* Create Template button for staff */}
            <button
              onClick={() => setStaffTemplateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create staff templates
            </button>

            {/* Manage Courses button */}
            <button
              onClick={() => setCoursesModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <BookOpenText className="h-4 w-4" />
              Manage Courses
            </button>

            {/* Manage Departments button */}
            <button
              onClick={() => setDepartmentsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Building2 className="h-4 w-4" />
              Manage Departments
            </button>

            {/* Manage Hierarchy button */}
            <button
              onClick={() => setHierarchyModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <GitFork className="h-4 w-4 text-amber-500" />
              Manage Hierarchy
            </button>

            {/* Delete All button */}
            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-700 text-sm font-medium rounded-lg cursor-pointer"
            >
              <Trash className="w-4 h-4" />
              Delete all
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className='flex items-center gap-4 mb-8'>
          <div className='flex-1 relative'>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type='text'
              onChange={(e) => setSearchQuery(e.target.value)}
              value={searchQuery}
              maxLength={255}
              placeholder='Search templates...'
              className='w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent'
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
