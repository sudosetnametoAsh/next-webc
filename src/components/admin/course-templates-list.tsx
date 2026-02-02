import CourseTemplateCard from '@/components/admin/course-template-card'
import { CourseTemplate } from '@/types/mock'

type CourseTemplatesListProps = {
  templates: CourseTemplate[]
  onManageTemplate?: (template: CourseTemplate) => void
}

const CourseTemplatesList = ({ templates, onManageTemplate }: CourseTemplatesListProps) => {
  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Course Templates</h2>
        <p className="text-sm text-slate-500 mt-1">Manage templates for each course</p>
      </div>

      {/* Templates Grid */}
      {/* Increased gap to gap-6 for better separation */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {templates.map((template) => (
          <CourseTemplateCard 
            key={template.id} 
            template={template} 
            onManageTemplate={onManageTemplate} 
          />
        ))}
      </div>
    </div>
  )
}

export default CourseTemplatesList