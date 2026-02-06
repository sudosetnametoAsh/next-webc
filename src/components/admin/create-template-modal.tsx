'use client'

import { useState, useEffect } from 'react' 
import { User, GripVertical, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { StaffAssignment } from '@/types/admin'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function CreateTemplateModal({ open, onOpenChange, onSuccess }: Props) {
  const [step, setStep] = useState<'select' | 'assign'>('select')
  const [isSaving, setIsSaving] = useState(false)
  
  // Data State
  const [courses, setCourses] = useState<{course_id: number, course_name: string}[]>([])
  const [departments, setDepartments] = useState<{dept_id: number, dept_name: string}[]>([])
  const [staff, setStaff] = useState<{staff_id: string, staff_name: string}[]>([])
  
  // Selection State
  const [selectedCourses, setSelectedCourses] = useState<number[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([])
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([])
  const [activeDeptId, setActiveDeptId] = useState<number | null>(null)

  useEffect(() => {
    if (open) {
        // 1. Fetch Courses
        fetch('/api/admin/courses')
            .then(res => res.json())
            .then(json => {
                if (json.data) {
                    // FIX: Map the API response (id, name) to the State format (course_id, course_name)
                    const mappedCourses = json.data.map((c: any) => ({
                        course_id: c.id,      // Map 'id' from API to 'course_id'
                        course_name: c.name   // Map 'name' from API to 'course_name'
                    }));
                    setCourses(mappedCourses);
                }
            })
            .catch(err => console.error("Failed to load courses", err));

        // 2. Fetch Departments (Mocked for now)
        setDepartments([
            { dept_id: 1, dept_name: 'Registrar' },
            { dept_id: 2, dept_name: 'Clinic' },
            { dept_id: 3, dept_name: 'Guidance' },
            { dept_id: 4, dept_name: 'Academic Head' },
        ])
        
        // 3. Fetch Staff (Mocked for now)
        setStaff([
             { staff_id: 's1', staff_name: 'Dr. Smith' },
             { staff_id: 's2', staff_name: 'Nurse Joy' },
        ])
    }
  }, [open])

  // --- Reset State on Close ---
  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setStep('select'); 
      setSelectedCourses([]); 
      setSelectedDepartments([]); 
      setStaffAssignments([]); 
      setActiveDeptId(null); 
      setIsSaving(false);
    }, 300)
  }

  // --- Selection Logic ---
  const toggleCourse = (id: number) => setSelectedCourses(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  const toggleDepartment = (id: number) => setSelectedDepartments(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  
  const handleNext = () => {
    if (selectedCourses.length === 0 || selectedDepartments.length === 0) return
    
    // Create assignment slots for selected departments
    setStaffAssignments(prev => selectedDepartments.map(dept_id => {
      const existing = prev.find(a => a.dept_id === dept_id)
      const deptName = departments.find(d => d.dept_id === dept_id)?.dept_name ?? ''
      return existing || { dept_id, dept_name: deptName, staff_id: null, staff_name: null }
    }))
    setStep('assign')
  }

  const handleBack = () => {
    if (activeDeptId !== null) setActiveDeptId(null)
    else if (step === 'assign') setStep('select')
  }

  const assignStaff = (dept_id: number, staff_id: string, staff_name: string) => {
    setStaffAssignments(prev => prev.map(a => a.dept_id === dept_id ? { ...a, staff_id, staff_name } : a))
    setActiveDeptId(null)
  }

  const handleSave = async () => {
    const allAssigned = staffAssignments.every((a) => a.staff_id !== null)
    if (!allAssigned) {
      alert('Please assign staff to all selected departments.')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseIds: selectedCourses,
          staffAssignments: staffAssignments
        })
      })

      if (!response.ok) throw new Error('Failed to save template')

      onSuccess?.() // Refresh the parent list
      handleClose()
    } catch (error) {
      console.error(error)
      alert('An error occurred while saving.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-lg max-h-[90vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>
             {step === 'select' ? 'Create Template' : activeDeptId !== null ? 'Select Staff' : 'Assign Staff'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 px-1 max-h-[60vh]">
          {step === 'select' ? (
             <SelectionStep 
               courses={courses} departments={departments}
               selectedCourses={selectedCourses} selectedDepartments={selectedDepartments}
               toggleCourse={toggleCourse} toggleDepartment={toggleDepartment}
             />
          ) : activeDeptId !== null ? (
            <StaffSelectionStep 
              staffList={staff} 
              // FIX: Explicitly type 'id' and 'name' as strings
              onSelect={(id: string, name: string) => assignStaff(activeDeptId, id, name)}
            />
          ) : (
            <AssignmentStep 
              assignments={staffAssignments} onSelectDepartment={setActiveDeptId}
            />
          )}
        </div>

        <div className='flex justify-between items-center border-t pt-4 mt-2'>
           <div className="flex gap-2">
            {step !== 'select' && (
              <button onClick={handleBack} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                Back
              </button>
            )}
           </div>

           <div className="flex gap-2">
             <button onClick={handleClose} disabled={isSaving} className='px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium'>
               Cancel
             </button>
             {step === 'select' ? (
                <button 
                  onClick={handleNext} 
                  disabled={selectedCourses.length === 0 || selectedDepartments.length === 0}
                  className='px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50'
                >
                  Next
                </button>
             ) : activeDeptId === null ? (
                <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className='px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-70 flex items-center gap-2'
                >
                  {isSaving ? 'Saving...' : 'Create Template'}
                </button>
             ) : null}
           </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Sub-components (No changes needed here, but included for completeness) ---

function SelectionStep({ courses, departments, selectedCourses, selectedDepartments, toggleCourse, toggleDepartment }: any) {
  return (
    <div className='space-y-6'>
      <div>
        <h4 className='text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider'>Assign to Sections</h4>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
          {courses.map((course: any) => (
            <label key={course.course_id} className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer ${selectedCourses.includes(course.course_id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
              <Checkbox checked={selectedCourses.includes(course.course_id)} onCheckedChange={() => toggleCourse(course.course_id)} />
              <span className='text-sm font-medium text-gray-700'>{course.course_name}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h4 className='text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider'>Include Departments</h4>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
          {departments.map((dept: any) => (
            <label key={dept.dept_id} className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer ${selectedDepartments.includes(dept.dept_id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
              <Checkbox checked={selectedDepartments.includes(dept.dept_id)} onCheckedChange={() => toggleDepartment(dept.dept_id)} />
              <span className='text-sm font-medium text-gray-700'>{dept.dept_name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function AssignmentStep({ assignments, onSelectDepartment }: any) {
  return (
    <div className="space-y-2">
      {assignments.map((assignment: any) => (
        <button key={assignment.dept_id} onClick={() => onSelectDepartment(assignment.dept_id)} className={`w-full flex items-center justify-between p-3 rounded-lg border text-left group ${assignment.staff_id ? 'bg-white border-gray-200 hover:border-blue-300' : 'bg-red-50 border-red-100'}`}>
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-full shadow-sm border"><GripVertical className="w-5 h-5 text-gray-400" /></div>
            <div>
              <p className="font-medium text-gray-900">{assignment.dept_name}</p>
              <p className={`text-sm ${assignment.staff_name ? 'text-blue-600' : 'text-red-500 italic'}`}>{assignment.staff_name ?? 'Tap to assign staff'}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      ))}
    </div>
  )
}

function StaffSelectionStep({ staffList, onSelect }: any) {
  return (
    <div className="space-y-2">
      {staffList.map((staff: any) => (
        <button key={staff.staff_id} onClick={() => onSelect(staff.staff_id, staff.staff_name)} className="w-full flex items-center gap-4 p-3 bg-white rounded-lg border border-gray-200 hover:bg-blue-50 text-left">
          <div className="bg-gray-100 p-2 rounded-full"><User className="w-5 h-5 text-gray-600" /></div>
          <span className="text-sm font-medium text-gray-700">{staff.staff_name}</span>
        </button>
      ))}
    </div>
  )
}