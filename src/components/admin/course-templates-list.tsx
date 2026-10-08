'use client'

import { useState } from 'react'
import ConfirmationModal from './confirmation-modal'
import { useFetchCourseTemplates } from '@/hooks/admin/course-templates'
import { useDeleteTemplates } from '@/hooks/admin/course-templates'
import { CourseTemplateStats } from '@/types/admin'
import { expandCourseAbbreviation, shrinkCourseName } from '@/utils/formatters'
import { Trash } from 'lucide-react'

type Props = {
  searchQuery: string;
  toastSuccess: (message: string, title?: string) => number;
  toastError: (message: string, title?: string) => number;
}

export default function CourseTemplatesList({ 
  searchQuery,
  toastSuccess,
  toastError
  }: Props) {

  // State for confirmation modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState(0)

  const { data: templates = [], isLoading } = useFetchCourseTemplates()
  const deleteTemplate = useDeleteTemplates()

  const filteredTemplates = templates.filter(template => {
    if (!searchQuery.trim()) { return templates }

    const query = searchQuery.trim().toLowerCase()

    // Filter by course abbreviation (e.g., BSCS, BSIT)
    if (
      template.course_name.toLowerCase().includes(query) || shrinkCourseName(template.course_name).toLowerCase().includes(query)
    ) { return true }
    // Filter by full course name
    if (expandCourseAbbreviation(template.course_name).toLowerCase().includes(query)) { return true }
  })

  const handleDelete = async (course_id?: number) => {
    setIsConfirmLoading(true)

    try {
      await deleteTemplate.mutateAsync(course_id)
    } catch(error) {
      console.error('Failed to delete template', error)
      toastError("Please try again.", "Failed to delete course template.")
    }

    setIsConfirmLoading(false)
    setIsConfirmOpen(false)
    toastSuccess("Course template removed successfully!")
  }

  if (isLoading) {
    return <div className="py-12 text-center text-slate-400 dark:text-slate-500">Loading...</div>
  }

  if (templates.length === 0) {
    return (
      <div className='border border-slate-200 dark:border-slate-800 rounded-lg p-32 text-center'>
        <p className='text-slate-400 dark:text-slate-500 text-sm'>No clearance templates found. Create a new one.</p>
      </div>
    )
  }

  if (filteredTemplates.length === 0) {
    return (
      <div className='border border-gray-200 dark:border-slate-800 rounded-lg p-32 text-center'>
        <p className='text-gray-500 dark:text-slate-400'>No results found for &quot;{searchQuery}&quot;</p>
      </div>
    )
  }
  
  return (
    <>
      <h3 className='text-xl font-bold text-gray-900 dark:text-slate-100 mb-4'>Student Templates</h3>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {filteredTemplates.map(template => (
          <CourseTemplateCard key={template.course_id as number} template={template} setIsConfirmOpen={setIsConfirmOpen} setSelectedCourseId={setSelectedCourseId} />
        ))}
      </div>
      <ConfirmationModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => handleDelete(selectedCourseId)}
        variant="destructive"
        title="Are you sure you want to delete this course template?"
        description="This action irreversible."
        confirmLabel="Yes, delete it"
        isLoading={isConfirmLoading}
      />
    </>
  )
}

function CourseTemplateCard({ template, setIsConfirmOpen, setSelectedCourseId }:  
  { 
    template: CourseTemplateStats;
    setIsConfirmOpen: (isConfirmOpen: boolean) => void;
    setSelectedCourseId: (selectedCourseId: number) => void;
  }) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/90 dark:border-slate-800 dark:bg-slate-900/90 p-5 hover:shadow-md transition-shadow shadow-xs">
        {/* Header */}
        <div className='mb-6'>
          <h3 className='text-lg font-bold text-gray-900 dark:text-slate-100 mb-1'>{shrinkCourseName(template.course_name) || template.course_name}</h3>
          <p className='text-sm text-gray-600 dark:text-slate-400'>{expandCourseAbbreviation(template.course_name) || template.course_name}</p>
        </div>

        {/* Completion Rate */}
        <div className='mb-4'>
          <div className='flex items-center justify-between mb-1'>
            <span className='text-sm text-gray-600 dark:text-slate-400 mb-1'>Completion Rate</span>
            <span className='text-base font-bold text-gray-900 dark:text-slate-100'>{template.completion_rate}%</span>
          </div>
          <div className='h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden'>
            <div 
              className='h-full bg-[#0B192C] dark:bg-amber-500 transition-[width] duration-500 ease-out'
              style={{ width: `${template.completion_rate}%` }}
            />
          </div>
        </div>

        {/* Total Students */}
        <div className='flex items-center justify-between mb-6'>
          <span className='text-sm text-gray-600 dark:text-slate-400'>Students Enrolled: </span>
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
            onClick={() => { setIsConfirmOpen(true); setSelectedCourseId(template.course_id as number); }}
          >
            <Trash className='w-4 h-4' />
          </button>
          <span>&nbsp;</span>
        </div>
      </div>
    )
}
