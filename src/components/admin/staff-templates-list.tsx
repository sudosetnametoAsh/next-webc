'use client'

import { useState } from 'react'
import ConfirmationModal from './confirmation-modal'
import { useFetchStaffTemplates, useDeleteStaffTemplates } from '@/hooks/admin/staff-templates'
import { CourseTemplateStats } from '@/types/admin'
import { Trash } from 'lucide-react'

type Props = {
  searchQuery: string;
  toastSuccess: (message: string, title?: string) => number;
  toastError: (message: string, title?: string) => number;
}

export default function StaffTemplatesList({ 
  searchQuery,
  toastSuccess,
  toastError
  }: Props) {

  // State for confirmation modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)
  const [selectedDeptIds, setSelectedDeptIds] = useState<number[]>([])

  const { data: templates = [], isLoading } = useFetchStaffTemplates()
  const deleteTemplate = useDeleteStaffTemplates()

  const filteredTemplates = templates.filter(template => {
    if (!searchQuery.trim()) { return true }
    const query = searchQuery.trim().toLowerCase()
    return template.course_name.toLowerCase().includes(query)
  })

  const handleDelete = async (deptIds: number[]) => {
    setIsConfirmLoading(true)

    try {
      await deleteTemplate.mutateAsync(deptIds)
      toastSuccess("Staff template removed successfully!")
    } catch(error) {
      console.error('Failed to delete template', error)
      toastError("Please try again.", "Failed to delete staff template.")
    }

    setIsConfirmLoading(false)
    setIsConfirmOpen(false)
  }

  if (isLoading) {
    return null // Parent handles loading or we show a skeleton
  }

  if (templates.length === 0) {
    return null // Don't show anything if no staff templates
  }

  if (filteredTemplates.length === 0) {
    return null
  }
  
  return (
    <>
      <div className='mb-8'>
        <h3 className='text-xl font-bold text-gray-900 dark:text-slate-100 mb-4'>Staff Templates</h3>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {filteredTemplates.map((template, idx) => (
            <StaffTemplateCard 
              key={idx} 
              template={template} 
              setIsConfirmOpen={setIsConfirmOpen} 
              setSelectedDeptIds={setSelectedDeptIds} 
            />
          ))}
        </div>
      </div>
      <ConfirmationModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => handleDelete(selectedDeptIds)}
        variant="destructive"
        title="Are you sure you want to delete the staff template?"
        description="This action is irreversible."
        confirmLabel="Yes, delete it"
        isLoading={isConfirmLoading}
      />
    </>
  )
}

function StaffTemplateCard({ template, setIsConfirmOpen, setSelectedDeptIds }:  
  { 
    template: CourseTemplateStats;
    setIsConfirmOpen: (isConfirmOpen: boolean) => void;
    setSelectedDeptIds: (deptIds: number[]) => void;
  }) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/90 dark:border-slate-800 dark:bg-slate-900/90 p-5 hover:shadow-md transition-shadow shadow-xs">
        {/* Header */}
        <div className='mb-6'>
          <h3 className='text-lg font-bold text-gray-900 dark:text-slate-100 mb-1'>{template.course_name}</h3>
          <p className='text-sm text-gray-600 dark:text-slate-400'>Clearance requirements for all staff members</p>
        </div>

        {/* Completion Rate */}
        <div className='mb-4'>
          <div className='flex items-center justify-between mb-1'>
            <span className='text-sm text-gray-600 dark:text-slate-400 mb-1'>Completion Rate</span>
            <span className='text-base font-bold text-gray-900 dark:text-slate-100'>{template.completion_rate}%</span>
          </div>
          <div className='h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden'>
            <div 
              className='h-full bg-emerald-600 dark:bg-emerald-500 transition-[width] duration-500 ease-out'
              style={{ width: `${template.completion_rate}%` }}
            />
          </div>
        </div>

        {/* Total Staff */}
        <div className='flex items-center justify-between mb-6'>
          <span className='text-sm text-gray-600 dark:text-slate-400'>Staff Members: </span>
          <span className='text-base font-bold text-gray-900 dark:text-slate-100'>{template.students_enrolled}</span>
        </div>

        {/* Assigned Departments */}
        <div className='mb-4'>
          <p className='text-sm font-bold text-gray-800 dark:text-slate-200 mb-2'>Assigned Departments</p>
          <div className='flex flex-wrap gap-2'>
            {template.departments.length > 0 ? (
              template.departments.map(dept => (
                <span 
                  key={dept.dept_id}
                  className='px-2 py-1 bg-slate-100 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                >{dept.dept_name}</span>
              ))
            ) : (
              <span className='text-sm text-gray-400 dark:text-slate-500'>No departments assigned</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
          <button 
            className="text-red-400 hover:text-red-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors cursor-pointer"
            onClick={() => { 
              setIsConfirmOpen(true); 
              setSelectedDeptIds(template.departments.map(d => d.dept_id)); 
            }}
          >
            <Trash className='w-4 h-4' />
          </button>
        </div>
      </div>
    )
}