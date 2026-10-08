'use client'

import { useState } from 'react'
import { useFetchDepartments } from '@/hooks/admin/departments'
import { ChevronRight, GripVertical, X, User } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import ConfirmationModal from '@/components/admin/confirmation-modal'
import { useFetchStaff } from '@/hooks/admin/fetch-staff'
import { useCreateTemplates } from '@/hooks/admin/course-templates'
import { useCreateStaffTemplates } from '@/hooks/admin/staff-templates'
import { StaffAssignment } from '@/types/admin'
import { Courses, Departments } from '@/types/admin'
import { expandCourseAbbreviation } from '@/utils/formatters'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // 'student' shows course + department selection; 'staff' shows department selection only
  mode: 'student' | 'staff'
  selectedCourses: number[]
  setSelectedCourses: React.Dispatch<React.SetStateAction<number[]>>
  selectedDepartments: number[]
  setSelectedDepartments: React.Dispatch<React.SetStateAction<number[]>>
  courses: Courses[]
  departments: Departments[]
  courseIds: number[]
  deptIds: number[]
  toastSuccess: (message: string, title?: string) => number
  toastError: (message: string, title?: string) => number
}

export default function CreateTemplateModal({
  open,
  onOpenChange,
  mode,
  selectedCourses,
  setSelectedCourses,
  selectedDepartments,
  setSelectedDepartments,
  courses,
  departments,
  courseIds,
  deptIds,
  toastSuccess,
  toastError,
}: Props) {

  // ————————————————————————————————————————
  // State
  // ————————————————————————————————————————

  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)
  const [step, setStep] = useState<'select' | 'assign'>('select')
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([])
  const [activeDeptId, setActiveDeptId] = useState<number | null>(null)

  const isStaff = mode === 'staff'

  // ————————————————————————————————————————
  // Hooks
  // ————————————————————————————————————————

  const { data: staff = [] } = useFetchStaff()
  const createStudentTemplates = useCreateTemplates()
  const createStaffTemplates = useCreateStaffTemplates()

  const isPending = isStaff
    ? createStaffTemplates.isPending
    : createStudentTemplates.isPending

  // ————————————————————————————————————————
  // Handlers
  // ————————————————————————————————————————

  const handleClose = () => {
    onOpenChange(false)
    setIsConfirmOpen(false)

    setTimeout(() => {
      setStep('select')
      setSelectedCourses(courseIds)
      setSelectedDepartments(deptIds)
      setStaffAssignments([])
      setActiveDeptId(null)
    }, 200)
  }

  const toggleCourse = (course_id: number) => {
    setSelectedCourses((prev) =>
      prev.includes(course_id)
        ? prev.filter((id) => id !== course_id)
        : [...prev, course_id]
    )
  }

  const toggleDepartment = (dept_id: number) => {
    setSelectedDepartments((prev) =>
      prev.includes(dept_id)
        ? prev.filter((id) => id !== dept_id)
        : [...prev, dept_id]
    )
  }

  const handleBack = () => {
    setStep('select')
    setActiveDeptId(null)
  }

  const handleNext = () => {
    // Staff mode: only departments required; skip course validation
    const hasValidSelection = isStaff
      ? selectedDepartments.length > 0
      : selectedCourses.length > 0 && selectedDepartments.length > 0

    if (!hasValidSelection) return

    const assignments: StaffAssignment[] = selectedDepartments.map((dept_id) => {
      const dept = departments?.find((d) => d.dept_id === dept_id)
      return {
        dept_id,
        dept_name: dept?.dept_name ?? '',
        staff_id: null,
        staff_name: null,
      }
    })

    setStaffAssignments(assignments)
    setStep('assign')
  }

  const assignStaff = (dept_id: number, staff_id: string, staff_name: string) => {
    setStaffAssignments((prev) =>
      prev.map((a) =>
        a.dept_id === dept_id ? { ...a, staff_id, staff_name } : a
      )
    )
    setActiveDeptId(null)
  }

  const handleConfirm = async () => {
    const allAssigned = staffAssignments.every((a) => a.staff_id !== null)
    if (!allAssigned) {
      toastError('Please ensure all departments have assigned staff.', 'Failed to create templates.')
      return
    }

    setIsConfirmLoading(true)

    try {
      if (isStaff) {
        await createStaffTemplates.mutateAsync({ assignments: staffAssignments })
      } else {
        await createStudentTemplates.mutateAsync({ courses: selectedCourses, assignments: staffAssignments })
      }

      toastSuccess('Created templates successfully!')
      handleClose()
    } catch (error) {
      console.error('Failed to create templates', error)
      toastError('Please try again.', 'Failed to create templates.')
    }

    setIsConfirmLoading(false)
    setIsConfirmOpen(false)
  }

  // ————————————————————————————————————————
  // Derived labels based on mode
  // ————————————————————————————————————————

  const dialogTitle = step === 'select' ? 'Create Template' : 'Select Staff'
  const dialogDescription = step === 'select'
    ? isStaff
      ? 'Create a clearance template for staff and assign it to departments'
      : 'Create a new clearance template and assign it to sections and departments'
    : 'Select a staff for a department'

  const nextDisabled = isStaff
    ? selectedDepartments.length === 0
    : selectedCourses.length === 0 || selectedDepartments.length === 0

  const confirmDescription = isStaff
    ? 'This will create clearance templates for all staff across selected departments.'
    : 'This will create clearance templates for all students across selected courses and departments.'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-lg dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100'>
        <DialogHeader>
          <DialogTitle className="dark:text-slate-100">{dialogTitle}</DialogTitle>
          <p className='text-gray-500 dark:text-slate-400 text-sm'>{dialogDescription}</p>
        </DialogHeader>

        {step === 'select' ? (
          <SelectionStep
            mode={mode}
            courses={courses}
            departments={departments}
            selectedCourses={selectedCourses}
            selectedDepartments={selectedDepartments}
            toggleCourse={toggleCourse}
            toggleDepartment={toggleDepartment}
          />
        ) : activeDeptId !== null ? (
          <StaffSelectionStep
            staffList={staff}
            onSelect={(staff_id, staff_name) => assignStaff(activeDeptId, staff_id, staff_name)}
            onCancel={() => setActiveDeptId(null)}
          />
        ) : (
          <AssignmentStep
            isConfirmOpen={isConfirmOpen}
            setIsConfirmOpen={setIsConfirmOpen}
            isConfirmLoading={isConfirmLoading}
            handleConfirm={handleConfirm}
            assignments={staffAssignments}
            onSelectDepartment={setActiveDeptId}
            confirmDescription={confirmDescription}
          />
        )}

        <div className='flex justify-end gap-2 border-t pt-4 dark:border-slate-800'>
          {step === 'assign' && activeDeptId === null && (
            <button
              onClick={handleBack}
              className='px-4 py-2 text-gray-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer'
            >
              Back
            </button>
          )}

          <button
            onClick={handleClose}
            className='px-4 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors cursor-pointer'
          >
            Cancel
          </button>

          {step === 'select' ? (
            <button
              onClick={handleNext}
              disabled={nextDisabled}
              className='px-4 py-2 bg-blue-500 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer font-semibold'
            >
              Next
            </button>
          ) : activeDeptId === null ? (
            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={isPending}
              className='px-4 py-2 bg-blue-500 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer font-semibold'
            >
              {isPending ? 'Saving...' : 'Save'}
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ————————————————————————————————————————
// Step 1: Select Courses (student only) and Departments
// ————————————————————————————————————————

function SelectionStep({
  mode,
  courses,
  departments,
  selectedCourses,
  selectedDepartments,
  toggleCourse,
  toggleDepartment,
}: {
  mode: 'student' | 'staff'
  courses: { course_id: number; course_name: string }[]
  departments: { dept_id: number; dept_name: string }[]
  selectedCourses: number[]
  selectedDepartments: number[]
  toggleCourse: (course_id: number) => void
  toggleDepartment: (dept_id: number) => void
}) {
  return (
    <div className='space-y-4'>
      {/* Course selection — hidden for staff mode */}
      {mode === 'student' && (
        <div>
          <h4 className='text-gray-900 dark:text-slate-100 font-medium mb-2'>Assign to Sections</h4>
          <div className='grid grid-cols-2 gap-2'>
            {courses.map((course) => (
              <label
                key={course.course_id}
                className='flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800/60 cursor-pointer'
              >
                <Checkbox
                  className='w-5 h-5 border-gray-400 dark:border-slate-600 rounded-sm'
                  checked={selectedCourses.includes(course.course_id)}
                  onCheckedChange={() => toggleCourse(course.course_id)}
                />
                <p className='text-sm text-gray-900 dark:text-slate-200 truncate'>
                  {expandCourseAbbreviation(course.course_name) || course.course_name}
                </p>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Department selection — same for both modes */}
      <div>
        <h4 className='text-gray-900 dark:text-slate-100 font-medium mb-2'>Include Departments</h4>
        <div className='grid grid-cols-2 gap-2'>
          {departments.map((department) => (
            <label
              key={department.dept_id}
              className='flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800/60 cursor-pointer'
            >
              <Checkbox
                className='w-5 h-5 border-gray-400 dark:border-slate-600 rounded-sm'
                checked={selectedDepartments.includes(department.dept_id)}
                onCheckedChange={() => toggleDepartment(department.dept_id)}
              />
              <p className='text-sm text-gray-900 dark:text-slate-200 truncate'>{department.dept_name}</p>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

// ————————————————————————————————————————
// Step 2: Department list with staff assignment
// ————————————————————————————————————————

function AssignmentStep({
  isConfirmOpen,
  setIsConfirmOpen,
  isConfirmLoading,
  assignments,
  handleConfirm,
  onSelectDepartment,
  confirmDescription,
}: {
  isConfirmOpen: boolean
  setIsConfirmOpen: (open: boolean) => void
  isConfirmLoading: boolean
  handleConfirm: () => void
  assignments: StaffAssignment[]
  onSelectDepartment: (dept_id: number) => void
  confirmDescription: string
}) {
  return (
    <>
      <div className='space-y-2'>
        {assignments.map((assignment) => (
          <button
            key={assignment.dept_id}
            onClick={() => onSelectDepartment(assignment.dept_id)}
            className='w-full flex items-center justify-between p-3 bg-gray-50 border border-transparent rounded-lg hover:bg-gray-100 dark:bg-slate-850 dark:border-slate-800 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer'
          >
            <div className='flex items-center gap-3'>
              <GripVertical className='w-6 h-6 text-gray-400 dark:text-slate-500' />
              <div className='flex flex-col gap-0.5'>
                <p className='text-sm font-semibold text-gray-900 dark:text-slate-100'>{assignment.dept_name}</p>
                <p className='text-xs text-gray-500 dark:text-slate-400'>
                  {assignment.staff_name ?? 'No Staff Assigned'}
                </p>
              </div>
            </div>
            <ChevronRight className='w-5 h-5 text-gray-400 dark:text-slate-500' />
          </button>
        ))}
      </div>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        variant='neutral'
        title='Are you sure you want to create templates?'
        description={confirmDescription}
        confirmLabel='Yes, create it'
        isLoading={isConfirmLoading}
      />
    </>
  )
}

// ————————————————————————————————————————
// Staff picker for a specific department
// ————————————————————————————————————————

function StaffSelectionStep({
  staffList,
  onSelect,
  onCancel,
}: {
  staffList: { staff_id: string; staff_name: string }[]
  onSelect: (staff_id: string, staff_name: string) => void
  onCancel: () => void
}) {
  return (
    <div className='space-y-2'>
      <button
        onClick={onCancel}
        className='flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 mb-4 cursor-pointer'
      >
        <X className='w-4 h-4' />
        Back to departments
      </button>
      {staffList.length === 0 ? (
        <p className='text-sm text-gray-400 dark:text-slate-500'>No staff available</p>
      ) : (
        staffList.map((s) => (
          <button
            key={s.staff_id}
            onClick={() => onSelect(s.staff_id, s.staff_name)}
            className='w-full flex items-center gap-3 p-3 bg-gray-50 border border-slate-200 rounded-lg hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-amber-400 transition-colors text-left cursor-pointer'
          >
            <div className='flex items-center justify-center gap-3'>
              <User className='w-6 h-6 text-slate-400 dark:text-slate-500' />
              <span className='text-sm font-medium'>{s.staff_name}</span>
            </div>
          </button>
        ))
      )}
    </div>
  )
}
