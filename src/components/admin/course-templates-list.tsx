'use client'

import { useFetchCourseTemplates } from '@/hooks/admin/fetch-templates'
import { useDeleteTemplates } from '@/hooks/admin/fetch-templates'
import { CourseTemplateStats } from '@/types/admin'
import { ArrowRight, Trash } from 'lucide-react'

export default function CourseTemplatesList({ searchQuery }: { searchQuery: string }) {
  const { data: templates = [], isLoading } = useFetchCourseTemplates()
  const deleteTemplate = useDeleteTemplates()

  const filteredTemplates = templates.filter(template => {
    if (!searchQuery.trim()) { return templates }

    const query = searchQuery.trim().toLowerCase()

    // Filter by course abbreviation (e.g., BSCS, BSIT)
    if (template.course_name.toLowerCase().includes(query)) { return true }
    // Filter by full course name
    if (expandCourseAbbreviation(template.course_name).toLowerCase().includes(query)) { return true }
  })

  const handleDelete = async (course_id: number) => {
    if (!confirm('Are you sure want to delete this course template?')) return

      try {
        await deleteTemplate.mutateAsync(course_id)
      } catch(error) {
        console.error('Failed to delete template', error)
      }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (templates.length === 0) {
    return (
      <div className='p-8 text-center'>
        <p className='text-gray-700'>No clearance templates found. Create a new one.</p>
      </div>
    )
  }

  if (filteredTemplates.length === 0) {
    return (
      <div className='p-8 text-center'>
        <p className='text-gray-700'>No results found for "{searchQuery}"</p>
      </div>
    )
  }
  
  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
      {filteredTemplates.map(template => (
        <CourseTemplateCard key={template.course_id} template={template} handleDelete={handleDelete}/>
      ))}
    </div>
  )
}

function CourseTemplateCard({ template, handleDelete }:  
  { 
    template: CourseTemplateStats 
    handleDelete: (course_id: number) => void 
  }) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-5 hover:shadow-md transition-shadow shadow-xs">
        {/* Header */}
        <div className='mb-6'>
          <h3 className='text-lg font-bold text-gray-900 mb-1'>{template.course_name}</h3>
          <p className='text-sm text-gray-500'>{expandCourseAbbreviation(template.course_name)}</p>
        </div>

        {/* Completion Rate */}
        <div className='mb-4'>
          <div className='flex item-center justify-between mb-1'>
            <span className='text-sm text-gray-500 mb-1'>Completion Rate</span>
            <span className='text-base font-bold text-gray-900'>{template.completion_rate}%</span>
          </div>
          <div className='h-2 bg-gray-100 rounded-full overflow-hidden'>
            <div 
              className='h-full bg-black transition-all duration-300'
              style={{ width: `${template.completion_rate}%` }}
            />
          </div>
        </div>

        {/* Total Students */}
        <div className='flex items-center justify-between mb-6'>
          <span className='text-sm text-gray-500'>Students Enrolled: </span>
          <span className='text-base font-bold text-gray-900'>{template.students_enrolled}</span>
        </div>

        {/* Assigned Departments */}
        <div className='mb-4'>
          <p className='text-sm font-bold text-gray-800 mb-2'>Assigned Departments</p>
          <div className='flex flex-wrap gap-2'>
            {template.departments.length > 0 ? (
              template.departments.map(dept => (
                <span 
                  key={dept.dept_id}
                  className='px-2 py-1 bg-gray-200 text-gray-900 font-medium text-xs rounded-md border border-gray-300'
                >{dept.dept_name}</span>
              ))
            ) : (
              <span className='text-sm text-gray-400'>No departments assigned</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <button 
            className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
            onClick={() => handleDelete(template.course_id)}
          >
            {/* {template.updated_at ? `Updated ${template.updated_at}` : "Updated a few hours ago"} */}
            <Trash className='w-4 h-4' />
          </button>
          <span>&nbsp;</span>
          {/* <button 
            className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1 transition-colors cursor-pointer"
            onClick={() => console.log(template.course_id)}
          >
            Manage
            <ArrowRight className="w-4 h-4" />
          </button> */}
        </div>
      </div>
    )
}

// Helper function to expand course abbreviations
function expandCourseAbbreviation(abbreviation: string): string {
  const shortNames: Record<string, string> = {
    'BSCS': 'Bachelor of Science in Computer Science',
    'BSIT': 'Bachelor of Science in Information Technology',
    'BSTM': 'Bachelor of Science in Tourism Management',
    'BSCPE': 'Bachelor of Science in Computer Engineering',
    'BMMA': 'Bachelor of Multimedia Arts',
  }

  return shortNames[abbreviation]
}