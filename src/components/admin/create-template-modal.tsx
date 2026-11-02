'use client'

import { useState, useEffect, useMemo } from 'react'
import { useFetchDepartments } from '@/hooks/admin/departments'
import {
  ChevronRight,
  GripVertical,
  X,
  User,
  GraduationCap,
  MapPin,
  Search,
  Check,
  Building2,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ConfirmationModal from '@/components/admin/confirmation-modal'
import { useFetchStaff } from '@/hooks/admin/fetch-staff'
import { useCreateTemplates } from '@/hooks/admin/course-templates'
import { useCreateStaffTemplates } from '@/hooks/admin/staff-templates'
import { StaffAssignment } from '@/types/admin'
import { Courses, Departments } from '@/types/admin'
import { expandCourseAbbreviation } from '@/utils/formatters'
import { getDepartmentIcon } from '@/lib/department-icons'
import TierBucketOrganizer from './tier-bucket-organizer'

export type EditTemplateData = {
  courseId?: number
  name?: string
  departments: {
    dept_id: number
    dept_name: string
    tier?: number
    staff_id?: string | null
    staff_name?: string | null
    icon_name?: string
  }[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // 'student' shows course + department selection; 'staff' shows department selection only
  mode: 'student' | 'staff'
  courses: Courses[]
  departments: Departments[]
  courseIds?: number[]
  deptIds?: number[]
  toastSuccess: (message: string, title?: string) => number
  toastError: (message: string, title?: string) => number
  editData?: EditTemplateData | null
  selectedCourses?: number[]
  setSelectedCourses?: React.Dispatch<React.SetStateAction<number[]>>
  selectedDepartments?: number[]
  setSelectedDepartments?: React.Dispatch<React.SetStateAction<number[]>>
}

export default function CreateTemplateModal({
  open,
  onOpenChange,
  mode,
  courses,
  departments,
  courseIds,
  deptIds,
  toastSuccess,
  toastError,
  editData = null,
}: Props) {

  // ————————————————————————————————————————
  // State
  // ————————————————————————————————————————

  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)
  const [step, setStep] = useState<'select' | 'assign'>('select')
  const [selectedCourses, setSelectedCourses] = useState<number[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([])
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([])
  const [activeDeptId, setActiveDeptId] = useState<number | null>(null)

  const isStaff = mode === 'staff'
  const isEdit = Boolean(editData)

  // Pre-populate assignments & selection on edit or open
  useEffect(() => {
    if (!open) return

    if (editData) {
      if (!isStaff && editData.courseId) {
        setSelectedCourses([editData.courseId])
      } else {
        setSelectedCourses([])
      }
      const initialDeptIds = editData.departments.map((d) => d.dept_id)
      setSelectedDepartments(initialDeptIds)

      const initialAssignments: StaffAssignment[] = editData.departments.map((d) => {
        const dept = departments?.find((dep) => dep.dept_id === d.dept_id)
        return {
          dept_id: d.dept_id,
          dept_name: d.dept_name || dept?.dept_name || '',
          staff_id: d.staff_id || null,
          staff_name: d.staff_name || null,
          tier: d.tier ?? 1,
          icon_name: d.icon_name || dept?.icon_name || 'Building2',
        }
      })
      setStaffAssignments(initialAssignments)
      setStep('select')
      setActiveDeptId(null)
    } else {
      setSelectedCourses(courses.map((c) => c.course_id))
      setSelectedDepartments(departments.map((d) => d.dept_id))
      setStaffAssignments([])
      setStep('select')
      setActiveDeptId(null)
    }
  }, [open, editData, isStaff, departments, courses])

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
      setSelectedCourses([])
      setSelectedDepartments([])
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
      const existing = staffAssignments.find((a) => a.dept_id === dept_id)
      if (existing) return existing

      const dept = departments?.find((d) => d.dept_id === dept_id)
      const deptName = dept?.dept_name ?? ''
      // Auto-assign smart default tier
      const defaultTier = deptName.toLowerCase().includes('cashier')
        ? 1
        : deptName.toLowerCase().includes('registrar')
        ? 3
        : 2

      return {
        dept_id,
        dept_name: deptName,
        staff_id: null,
        staff_name: null,
        tier: defaultTier,
        icon_name: dept?.icon_name || 'Building2',
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

      toastSuccess(isEdit ? 'Template updated successfully!' : 'Created templates successfully!')
      handleClose()
    } catch (error) {
      console.error('Failed to create templates', error)
      toastError('Please try again.', isEdit ? 'Failed to update template.' : 'Failed to create templates.')
    }

    setIsConfirmLoading(false)
    setIsConfirmOpen(false)
  }

  // ————————————————————————————————————————
  // Derived labels based on mode
  // ————————————————————————————————————————

  const dialogTitle = isEdit
    ? step === 'select'
      ? isStaff
        ? 'Edit Staff Clearance Template'
        : `Edit Template: ${editData?.name || 'Course'}`
      : activeDeptId !== null
      ? 'Select Staff'
      : 'Organize Phases & Assign Staff'
    : step === 'select'
    ? 'Create Template'
    : activeDeptId !== null
    ? 'Select Staff'
    : 'Organize Phases & Assign Staff'

  const dialogDescription = step === 'select'
    ? isStaff
      ? isEdit
        ? 'Update participating departments for staff clearance'
        : 'Create a clearance template for staff and assign it to departments'
      : isEdit
      ? 'Update participating departments for this course clearance template'
      : 'Create a new clearance template and assign it to sections and departments'
    : activeDeptId !== null
    ? 'Select a staff officer for this department'
    : 'Organize departments into sequential sign-off phases and assign staff officers.'

  const nextDisabled = isStaff
    ? selectedDepartments.length === 0
    : selectedCourses.length === 0 || selectedDepartments.length === 0

  const removedDepts = isEdit
    ? (editData?.departments || []).filter((d) => !selectedDepartments.includes(d.dept_id))
    : []

  const confirmDescription = isEdit
    ? isStaff
      ? `This will update clearance requirements and phases for all staff across selected departments.${
          removedDepts.length > 0
            ? ` ${removedDepts.length} unselected department(s) will be safely archived; existing clearance sign-offs and tasks remain preserved.`
            : ''
        }`
      : `This will update clearance requirements and phases for students in this degree program.${
          removedDepts.length > 0
            ? ` ${removedDepts.length} unselected department(s) will be safely archived; existing student submissions and approvals remain preserved.`
            : ''
        }`
    : isStaff
    ? 'This will create clearance templates for all staff across selected departments.'
    : 'This will create clearance templates for all students across selected courses and departments.'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-2xl max-h-[90vh] flex flex-col p-0 border border-slate-800 bg-[#0a101f] text-slate-100 shadow-2xl rounded-2xl overflow-hidden'>
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-[#070c18] flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {dialogTitle}
            </DialogTitle>
            <p className='mt-1 text-xs text-slate-400 truncate sm:whitespace-normal'>
              {dialogDescription}
            </p>
          </div>

          {/* Stepper badge indicator */}
          {activeDeptId === null && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/90 text-xs shrink-0">
              <span className={`font-semibold flex items-center gap-1.5 ${step === 'select' ? 'text-amber-400' : 'text-slate-500'}`}>
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${step === 'select' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                  1
                </span>
                Selection
              </span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
              <span className={`font-semibold flex items-center gap-1.5 ${step === 'assign' ? 'text-amber-400' : 'text-slate-500'}`}>
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${step === 'assign' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                  2
                </span>
                Phases & Staff
              </span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'select' ? (
            <SelectionStep
              mode={mode}
              courses={courses}
              departments={departments}
              selectedCourses={selectedCourses}
              selectedDepartments={selectedDepartments}
              toggleCourse={toggleCourse}
              toggleDepartment={toggleDepartment}
              setSelectedCourses={setSelectedCourses}
              setSelectedDepartments={setSelectedDepartments}
            />
          ) : activeDeptId !== null ? (
            <StaffSelectionStep
              staffList={staff}
              department={departments?.find((d) => d.dept_id === activeDeptId)}
              onSelect={(staff_id, staff_name) => assignStaff(activeDeptId, staff_id, staff_name)}
              onCancel={() => setActiveDeptId(null)}
            />
          ) : (
            <div className="space-y-4">
              <TierBucketOrganizer
                assignments={staffAssignments}
                onAssignmentsChange={setStaffAssignments}
                onSelectDepartmentForStaff={setActiveDeptId}
              />

              <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirm}
                variant='neutral'
                title={isEdit ? 'Save Template Changes?' : 'Create Clearance Template?'}
                description={confirmDescription}
                confirmLabel={isEdit ? 'Save Changes' : 'Yes, Create Template'}
                isLoading={isConfirmLoading}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className='px-6 py-4 border-t border-slate-800 bg-[#070c18] flex items-center justify-end gap-3'>
          {step === 'assign' && activeDeptId !== null ? (
            <button
              type="button"
              onClick={() => setActiveDeptId(null)}
              className='rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer'
            >
              Back to Phases
            </button>
          ) : (
            <>
              {step === 'assign' && (
                <button
                  type="button"
                  onClick={handleBack}
                  className='rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer'
                >
                  Back
                </button>
              )}

              <button
                type="button"
                onClick={handleClose}
                className='rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer'
              >
                Cancel
              </button>

              {step === 'select' ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={nextDisabled}
                  className='flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2 text-xs shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer'
                >
                  <span>Next: Configure Phases</span>
                  <ChevronRight className="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={isPending}
                  className='flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2 text-xs shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer'
                >
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>{isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Template'}</span>
                </button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ————————————————————————————————————————
// Step 1: Select Courses (student only) and Clearance Offices
// ————————————————————————————————————————

function SelectionStep({
  mode,
  courses,
  departments,
  selectedCourses,
  selectedDepartments,
  toggleCourse,
  toggleDepartment,
  setSelectedCourses,
  setSelectedDepartments,
}: {
  mode: 'student' | 'staff'
  courses: Courses[]
  departments: Departments[]
  selectedCourses: number[]
  selectedDepartments: number[]
  toggleCourse: (course_id: number) => void
  toggleDepartment: (dept_id: number) => void
  setSelectedCourses: React.Dispatch<React.SetStateAction<number[]>>
  setSelectedDepartments: React.Dispatch<React.SetStateAction<number[]>>
}) {
  const allCoursesSelected = courses.length > 0 && selectedCourses.length === courses.length
  const toggleAllCourses = () => {
    if (allCoursesSelected) {
      setSelectedCourses([])
    } else {
      setSelectedCourses(courses.map((c) => c.course_id))
    }
  }

  const allDeptsSelected = departments.length > 0 && selectedDepartments.length === departments.length
  const toggleAllDepartments = () => {
    if (allDeptsSelected) {
      setSelectedDepartments([])
    } else {
      setSelectedDepartments(departments.map((d) => d.dept_id))
    }
  }

  return (
    <div className='space-y-6'>
      {/* Course selection — hidden for staff mode */}
      {mode === 'student' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Assign to Courses <span className="text-amber-400">*</span>
              </label>
              <span className="text-[11px] font-mono text-slate-500">
                ({selectedCourses.length}/{courses.length})
              </span>
            </div>
            {courses.length > 0 && (
              <button
                type="button"
                onClick={toggleAllCourses}
                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                {allCoursesSelected ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1'>
            {courses.map((course) => {
              const isChecked = selectedCourses.includes(course.course_id)
              return (
                <button
                  key={course.course_id}
                  type="button"
                  onClick={() => toggleCourse(course.course_id)}
                  className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer w-full ${
                    isChecked
                      ? 'border-amber-500/80 bg-amber-500/10 text-white ring-1 ring-amber-500/30 shadow-md shadow-amber-500/5'
                      : 'border-slate-800/90 bg-[#070c18]/70 text-slate-400 hover:border-slate-700 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
                      isChecked
                        ? 'border-amber-500 bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-700/80 bg-slate-800/70 text-slate-400 group-hover:text-slate-300 group-hover:border-slate-600'
                    }`}
                  >
                    <GraduationCap className="h-5 w-5 transition-transform group-hover:scale-105" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold truncate transition-colors ${
                      isChecked ? 'text-white' : 'text-slate-200 group-hover:text-white'
                    }`}>
                      {course.course_name}
                    </p>
                    <p className={`text-[11px] truncate transition-colors ${
                      isChecked ? 'text-amber-200/80' : 'text-slate-400'
                    }`}>
                      {expandCourseAbbreviation(course.course_name) || course.course_name}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Department selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Clearance Offices <span className="text-amber-400">*</span>
            </label>
            <span className="text-[11px] font-mono text-slate-500">
              ({selectedDepartments.length}/{departments.length})
            </span>
          </div>
          {departments.length > 0 && (
            <button
              type="button"
              onClick={toggleAllDepartments}
              className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              {allDeptsSelected ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto pr-1 ${
          mode === 'student' ? 'max-h-52' : 'max-h-[380px]'
        }`}>
          {departments.map((department) => {
            const isChecked = selectedDepartments.includes(department.dept_id)
            const DeptIcon = getDepartmentIcon(department.icon_name, department.dept_name)

            return (
              <button
                key={department.dept_id}
                type="button"
                onClick={() => toggleDepartment(department.dept_id)}
                className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer w-full ${
                  isChecked
                    ? 'border-amber-500/80 bg-amber-500/10 text-white ring-1 ring-amber-500/30 shadow-md shadow-amber-500/5'
                    : 'border-slate-800/90 bg-[#070c18]/70 text-slate-400 hover:border-slate-700 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
                    isChecked
                      ? 'border-amber-500 bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/20 shadow-xs'
                      : 'border-slate-700/80 bg-slate-800/70 text-slate-400 group-hover:text-slate-300 group-hover:border-slate-600'
                  }`}
                >
                  <DeptIcon className="h-5 w-5 transition-transform group-hover:scale-105" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold truncate transition-colors ${
                    isChecked ? 'text-white' : 'text-slate-200 group-hover:text-white'
                  }`}>
                    {department.dept_name}
                  </p>
                  {department.floor || department.room ? (
                    <p className={`text-[11px] truncate flex items-center gap-1 transition-colors ${
                      isChecked ? 'text-amber-200/80' : 'text-slate-500'
                    }`}>
                      <MapPin className="h-2.5 w-2.5 shrink-0 text-amber-400" />
                      <span>
                        {[department.floor, department.room].filter(Boolean).join(' · ')}
                      </span>
                    </p>
                  ) : (
                    <p className={`text-[11px] truncate transition-colors ${
                      isChecked ? 'text-amber-200/80' : 'text-slate-500'
                    }`}>
                      Clearance Signatory
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ————————————————————————————————————————
// Staff picker for a specific department
// ————————————————————————————————————————

function StaffSelectionStep({
  staffList,
  department,
  onSelect,
  onCancel,
}: {
  staffList: { staff_id: string; staff_name: string }[]
  department?: Departments
  onSelect: (staff_id: string, staff_name: string) => void
  onCancel: () => void
}) {
  const [search, setSearch] = useState('')

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return staffList
    return staffList.filter(
      (s) =>
        s.staff_name.toLowerCase().includes(q) ||
        s.staff_id.toLowerCase().includes(q)
    )
  }, [staffList, search])

  const DeptIcon = getDepartmentIcon(department?.icon_name, department?.dept_name)

  return (
    <div className='space-y-4'>
      {/* Department Context Card & Back Button */}
      <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-800 bg-[#070c18]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400">
            <DeptIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              Assign Signatory Officer
            </span>
            <h4 className="text-sm font-bold text-white truncate">
              {department?.dept_name || 'Department'}
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className='flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer'
        >
          <X className='w-3.5 h-3.5' />
          <span>Cancel</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search staff officer by name or ID..."
          autoFocus
          className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 shadow-inner focus:border-amber-500/60 focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
        />
      </div>

      {/* Staff List */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {filteredStaff.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            {search.trim() ? `No staff officer matching "${search}"` : 'No staff officers registered'}
          </div>
        ) : (
          filteredStaff.map((s) => (
            <button
              key={s.staff_id}
              type="button"
              onClick={() => onSelect(s.staff_id, s.staff_name)}
              className='w-full flex items-center justify-between p-3 bg-[#070c18] rounded-xl border border-slate-800 hover:border-amber-500/60 hover:bg-amber-500/5 transition-all text-left cursor-pointer group'
            >
              <div className='flex items-center gap-3 min-w-0'>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-400 group-hover:border-amber-500/40 group-hover:bg-amber-500/10 group-hover:text-amber-400 transition-colors">
                  <User className='w-4 h-4' />
                </div>
                <div className="min-w-0">
                  <span className='text-xs font-bold text-white block truncate group-hover:text-amber-300 transition-colors'>
                    {s.staff_name}
                  </span>
                  <span className='text-[10px] text-slate-500 font-mono'>
                    ID: {s.staff_id}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Select →
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
