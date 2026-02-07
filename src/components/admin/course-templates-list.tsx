'use client'

import { useFetchCourseTemplates } from '@/hooks/admin/fetch-templates'
import { CourseTemplateStats } from '@/types/admin'
// import { ArrowRight } from 'lucide-react'

export default function CourseTemplatesList() {
  const { data: templates = [], isLoading } = useFetchCourseTemplates()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (templates.length === 0) {
    return <div>No course templates found. Create one to get started.</div>
  }
  
  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
      {templates.map(template => (
        <CourseTemplateCard key={template.course_id} template={template} />
      ))}
    </div>
  )
}

function CourseTemplateCard({ template }:  { template: CourseTemplateStats }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className='mb-4'>
        <h3 className='font-semibold text-gray-900'>{template.course_name}</h3>
        <p className='text-sm text-gray-500'>{expandCourseAbbreviation(template.course_name)}</p>
      </div>

      {/* Completion Rate */}
      <div className='mb-4'>
        <div className='flex item-center justify-between mb-1'>
          <span className='text-sm text-gray-500'>Completion Rate</span>
          <span className='text-sm font-medium text-gray-700'>{template.completion_rate}%</span>
        </div>
        <div className='h-2 bg-gray-100 rounded-full overflow-hidden'>
          <div 
            className='h-full bg-black transition-all duration-300'
            style={{ width: `${template.completion_rate}%` }}
          />
        </div>
      </div>

      {/* Total Students */}
      <div className='flex items-center justify-between mb-4'>
        <span className='text-sm text-gray-500'>Students Enrolled: </span>
        <span className='text-sm font-medium text-gray-700'>{template.students_enrolled}</span>
      </div>

      {/* Assigned Departments */}
      <div>
        <p className='text-sm font-semibold text-gray-700 mb-2'>Assigned Departments</p>
        <div className='flex flex-wrap gap-2'>
          {template.departments.length > 0 ? (
            template.departments.map(dept => (
              <span 
                key={dept.dept_id}
                className='px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md'
              >{dept.dept_name}</span>
            ))
          ) : (
            <span className='text-sm text-gray-400'>No departments assigned</span>
          )}
        </div>
      </div>

      {/* Footer */}
      {/* <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {template.updated_at ? `Updated ${template.updated_at}` : "Updated a few hours ago"}
        </span>
        <button className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1 transition-colors">
          Manage
          <ArrowRight className="w-4 h-4" />
        </button>
      </div> */}
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