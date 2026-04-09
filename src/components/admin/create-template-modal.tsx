'use client'

import { useEffect, useRef, useState } from 'react' 
import { ChevronRight, GripVertical, X, User } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import ConfirmationModal  from '@/components/admin/confirmation-modal'
import { useFetchCourses } from '@/hooks/admin/fetch-courses'
import { useFetchDepartments } from '@/hooks/admin/departments'
import { useFetchStaff } from '@/hooks/admin/fetch-staff'
import { useCreateTemplates } from '@/hooks/admin/course-templates'
import { StaffAssignment } from '@/types/admin'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CreateTemplateModal({ open, onOpenChange }: Props) {
  // Hooks
  const { data: courses = [], isSuccess: isSucessCourses } = useFetchCourses()
  const { data: departments = [], isSuccess: isSuccessDepts } = useFetchDepartments()
  const { data: staff = [] } = useFetchStaff()
  const createTemplates = useCreateTemplates()
  
  const courseIds = () => courses?.map(c => c.course_id)
  const deptIds = () => departments?.map(d => d.dept_id)

  // State
  const [step, setStep] = useState<'select' | 'assign'>('select')
  const [selectedCourses, setSelectedCourses] = useState<number[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([])
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([])
  const [activeDeptId, setActiveDeptId] = useState<number | null>(null)

  // State for confirmation modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)

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


  // --- Handlers ---
  const handleClose = () => {
    onOpenChange(false)
    setIsConfirmOpen(false)

    // Reset all state on close after animation
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
      prev.includes(course_id) // Is course already in the list?
        ? prev.filter((id) => id !== course_id) // YES: remove it
        : [...prev, course_id]                  // NO: add it
    )
  }

  const toggleDepartment = (dept_id: number) => {
    setSelectedDepartments((prev) => 
      prev.includes(dept_id) // Is department already in the list?
        ? prev.filter((id) => id !== dept_id) // YES: remove it
        : [...prev, dept_id]                  // NO: add it
    ) 
  }

  const handleBack = () => {
    setStep('select')
    setActiveDeptId(null)
  }

  const handleNext = () => {
    if (selectedCourses.length === 0 || selectedDepartments.length === 0) {
      return
    }

    // Initialize staff assignments for selected departments
    const assignments: StaffAssignment[] = selectedDepartments.map((dept_id) => {
      const dept = departments?.find((dept) => dept.dept_id === dept_id)
      return {
        dept_id: dept_id,
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
      prev.map((assignment) =>
        assignment.dept_id === dept_id
          ? { ...assignment, staff_id: staff_id, staff_name: staff_name }
        : assignment
      ))

    setActiveDeptId(null)
  }

  const handleConfirm = async () => {
    const allAssigned = staffAssignments.every((assignment) => assignment.staff_id !== null)
    if (!allAssigned) {
      alert('Please assign staff to all selected departments.')
      return
    }
    
    setIsConfirmLoading(true)

    try {
      await createTemplates.mutateAsync({ courses: selectedCourses, assignments: staffAssignments })
      handleClose()

    } catch (error) {
      console.error('Failed to create templates', error)
    }

    setIsConfirmLoading(false)
    setIsConfirmOpen(false)

  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max:w-lg'>
        <DialogHeader>
          <DialogTitle>{ step === 'select' ? 'Create Template' : 'Select Staff' }</DialogTitle>
          <p className='text-gray-500 text-sm'>
            { step === 'select' 
              ? 'Create a new clearance template and assign it to sections and departments'
              : 'Select a staff for a department'
            }
          </p>
        </DialogHeader>

        { step === 'select' ? (
          <SelectionStep 
            courses={courses}
            departments={departments}
            selectedCourses={selectedCourses}
            selectedDepartments={selectedDepartments}
            toggleCourse={toggleCourse}  
            toggleDepartment={toggleDepartment}
          />
          )
          : activeDeptId !== null ? (
            <StaffSelectionStep 
              staffList={staff}
              onSelect={(staff_id, staff_name) => {
                assignStaff(activeDeptId, staff_id, staff_name)
              }}
              onCancel={() => setActiveDeptId(null)}
            />
          )
          : (
            <AssignmentStep 
              isConfirmOpen={isConfirmOpen}
              setIsConfirmOpen={setIsConfirmOpen}
              isConfirmLoading={isConfirmLoading}
              handleConfirm={handleConfirm}
              assignments={staffAssignments}
              onSelectDepartment={setActiveDeptId}
            />
          )
       }

       <div className='flex justify-end gap-2 border-t pt-4'>
          {/* Back Button */}
          { step === 'assign' && activeDeptId === null && (
            <button 
              onClick={handleBack}
              className='px-4 py-2 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors cursor-pointer'
            >
              Back
            </button>
          )
          }

          {/* Cancel Button */}
          <button
            onClick={handleClose}
            className='px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer'
          >
            Cancel
          </button>

          {/* Next Button */}
          { step === 'select' ? (
            <button
              onClick={handleNext}
              disabled={selectedCourses.length === 0 || selectedDepartments.length === 0}
              className='px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer'
            >
              Next
            </button>
          ) : activeDeptId === null ? (
            // Save Button
            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={createTemplates.isPending}
              className='px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer' 
            >
              {createTemplates.isPending ? 'Saving...' : 'Save'}
            </button>
          ) : null

          }
        </div>
        
      </DialogContent>
    </Dialog>
  )
}

// Step 1: Select Courses and Departments
function SelectionStep({
  courses,
  departments,
  selectedCourses,
  selectedDepartments,
  toggleCourse,
  toggleDepartment
}: {
  courses: { course_id: number, course_name: string }[]
  departments: { dept_id: number, dept_name: string }[]
  selectedCourses: number[]
  selectedDepartments: number[]
  toggleCourse: (course_id: number) => void
  toggleDepartment: (dept_id: number) => void
}) {

  return (
    <div className='space-y-4'>
      {/* Course Selections */}
      <div>
        <h4 className='text-gray-900 font-medium mb-2'>Assign to Sections</h4>
        <div className='grid grid-cols-2 gap-2'>
          {courses.map((course) => (
            <label 
              key={course.course_id}
              className='flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer'
            >
              <Checkbox 
                className='w-6 h-6 border-gray-500 rounded-sm' 
                checked={selectedCourses.includes(course.course_id)}
                onCheckedChange={() => toggleCourse(course.course_id)}
              />
              <p className='text-sm text-gray-900'>{course.course_name}</p>
            </label>
          ))}
        </div>
      </div>
          
      {/* Department Selections */}
      <div>
        <h4 className='text-gray-900 font-medium mb-2'>Include Departments</h4>
        <div className='grid grid-cols-2 gap-2'>
          {departments.map((department) => (
            <label 
              key={department.dept_id}
              className='flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer'
            >
              <Checkbox 
                className='w-6 h-6 border-gray-500 rounded-sm' 
                checked={selectedDepartments.includes(department.dept_id)}
                onCheckedChange={() => toggleDepartment(department.dept_id)}
              />
              <p className='text-sm text-gray-900'>{department.dept_name}</p>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

// Step 2: Department list with staff assignment
function AssignmentStep({
  isConfirmOpen,
  setIsConfirmOpen,
  isConfirmLoading,
  assignments,
  handleConfirm,
  onSelectDepartment,
}: {
  isConfirmOpen: boolean
  setIsConfirmOpen: (isConfirmOpen: boolean) => void
  isConfirmLoading: boolean
  handleConfirm: () => void
  assignments: StaffAssignment[]
  onSelectDepartment: (dept_id: number) => void
}) {
  return (
    <>
      <div className='space-y-2'>
        {assignments.map((assignment) => (
          <button
            key={assignment.dept_id}
            onClick={() => onSelectDepartment(assignment.dept_id)}
            className='w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left cursor-pointer'
          >
            <div className='flex items-center gap-3'>
              <GripVertical className='w-8 h-8 text-gray-400' />
              <div className='flex flex-col gap-1'>
                <p className='text-l font-medium text-gray-900'>
                  {assignment.dept_name}
                  </p>
                <p className='text-xs text-gray-500'>
                  {assignment.staff_name ?? 'No Staff Assigned'}
                </p>
              </div>
            </div>
            <ChevronRight className='w-8 h-8 text-gray-400' />
          </button>
        ))}
      </div>

      <ConfirmationModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        variant="neutral"
        title="Are you sure you want to create templates?"
        description="This will create clearance templates for all students across selected courses and departments."
        confirmLabel="Yes, create it"
        isLoading={isConfirmLoading}
      />
    </>
  )
}

// Staff selection for a specific department
function StaffSelectionStep({
  staffList,
  onSelect,
  onCancel,
}: {
  staffList: { staff_id: string, staff_name: string }[]
  onSelect: (staff_id: string, staff_name: string) => void
  onCancel: () => void
}) {
  return (
    <div className='space-y-2'>
      <button
        onClick={onCancel}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 cursor-pointer"
      >
        <X className="w-4 h-4" />
        Back to departments
      </button>
      {staffList.length === 0 ? (
        <p>No staff available</p>
      ) : (
        staffList.map((staff) => (
        <button
          key={staff.staff_id}
          onClick={() => onSelect(staff.staff_id, staff.staff_name)}
          className='w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg border hover:bg-blue-50 hover:text-blue-700 transition-colors text-left cursor-pointer'
        >
          <div className="flex items-center justify-center gap-3">
            <User className='w-8 h-8' />
            <span className="text-sm font-medium">{staff.staff_name}</span>
          </div>
        </button>
        ))
      )
      }
    </div>
  )
}