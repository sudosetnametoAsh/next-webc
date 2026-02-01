import Card from '@/components/admin/card'
import CardContent from '@/components/admin/card-content'
import ProgressBar from '@/components/admin/progress-bar'
import Badge from '@/components/admin/badge'
import { CourseTemplate } from '@/types/mock'
import CardFooter from '@/components/admin/card-footer'
import { ArrowRightIcon } from 'lucide-react'

type CourseTemplateCardProps = {
  template: CourseTemplate
  onManageTemplate?: (template: CourseTemplate) => void
}

const CourseTemplateCard = ({ template, onManageTemplate }: CourseTemplateCardProps) => {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex-1">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{template.code}</h3>
          <p className="text-sm text-gray-500">{template.name}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <ProgressBar value={template.completionRate} />
        </div>

        {/* Students Enrolled */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-emerald-600">Students Enrolled</span>
          <span className="text-sm font-medium text-gray-900">{template.studentsEnrolled}</span>
        </div>

        {/* Assigned Departments */}
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Assigned Departments</p>
          <div className="flex flex-wrap gap-1.5">
            {template.assignedDepartments.map((dept) => (
              <Badge key={dept} variant="default">
                {dept}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <span className="text-xs text-gray-400">Updated a few hours ago</span>
        <button
          onClick={() => onManageTemplate?.(template)}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Manage
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </CardFooter>
    </Card>
  )
}

export default CourseTemplateCard