import Card from '@/components/admin/card'
import Badge from '@/components/admin/badge'
import { CourseTemplate } from '@/types/mock'
import { ArrowRight } from 'lucide-react'

type CourseTemplateCardProps = {
  template: CourseTemplate
  onManageTemplate?: (template: CourseTemplate) => void
}

const CourseTemplateCard = ({ template, onManageTemplate }: CourseTemplateCardProps) => {
  return (
    <Card className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
      
      {/* 1. Single Padding Container (p-6)
        This ensures the Header, Divider, and Footer all align perfectly 
        and creates the "inset" look for the divider line.
      */}
      <div className="p-6 flex flex-col h-full">
        
        {/* --- CONTENT SECTION --- */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Header: Code & Name */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">{template.code}</h3>
            <p className="text-sm text-gray-500 mt-1">{template.name}</p>
          </div>

          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-xs font-medium text-gray-400">Completion Rate</span>
              <span className="text-sm font-bold text-slate-900">{template.completionRate}%</span>
            </div>
            
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-slate-900 h-full rounded-full" 
                style={{ width: `${template.completionRate}%` }}
              />
            </div>
          </div>

          {/* Students Enrolled Row */}
          <div className="flex justify-between items-center text-xs font-medium">
            <span className="text-gray-400">Students Enrolled</span>
            <span className="text-sm font-bold text-slate-900">{template.studentsEnrolled}</span>
          </div>

          {/* Assigned Departments Tags */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wide">Assigned Departments</p>
            <div className="flex flex-wrap gap-2">
              {template.assignedDepartments.map((dept) => (
                <Badge key={dept} variant="default">
                  {dept}
                </Badge>
              ))}
            </div>
          </div>

        </div>

        {/* --- DIVIDER --- */}
        
        <div className="h-px bg-gray-100 my-5" />

        {/* --- FOOTER SECTION --- */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">Updated a few hours ago</span>
          
          <button
            onClick={() => onManageTemplate?.(template)}
            className="group flex items-center gap-1 text-xs font-bold text-slate-900 hover:gap-2 transition-all"
          >
            Manage
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>
    </Card>
  )
}

export default CourseTemplateCard