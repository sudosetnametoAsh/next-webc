'use client'

import { useState } from 'react'
import ConfirmationModal from './confirmation-modal'
import { useFetchCourseTemplates, useDeleteTemplates } from '@/hooks/admin/course-templates'
import { CourseTemplateStats } from '@/types/admin'
import { expandCourseAbbreviation, shrinkCourseName, getProgressBarColor } from '@/utils/formatters'
import { Trash2, Loader2, GraduationCap, Layers } from 'lucide-react'
import { getDepartmentIcon } from '@/lib/department-icons'

type Props = {
  searchQuery: string;
  toastSuccess: (message: string, title?: string) => number;
  toastError: (message: string, title?: string) => number;
  hideEmptyState?: boolean;
}

export default function CourseTemplatesList({ 
  searchQuery,
  toastSuccess,
  toastError,
  hideEmptyState = false
}: Props) {

  // State for confirmation modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState(0)

  const { data: templates = [], isLoading } = useFetchCourseTemplates()
  const deleteTemplate = useDeleteTemplates()

  const filteredTemplates = templates.filter(template => {
    if (!searchQuery.trim()) { return true }

    const query = searchQuery.trim().toLowerCase()

    // Filter by course abbreviation (e.g., BSCS, BSIT)
    if (
      template.course_name.toLowerCase().includes(query) || 
      shrinkCourseName(template.course_name).toLowerCase().includes(query)
    ) { return true }
    
    // Filter by full course name
    if (expandCourseAbbreviation(template.course_name).toLowerCase().includes(query)) { return true }

    // Filter by department name
    if (template.departments.some(d => d.dept_name.toLowerCase().includes(query))) { return true }

    return false
  })

  const handleDelete = async (course_id?: number) => {
    setIsConfirmLoading(true)

    try {
      await deleteTemplate.mutateAsync(course_id)
      toastSuccess("Course template removed successfully!")
    } catch(error) {
      console.error('Failed to delete template', error)
      toastError("Please try again.", "Failed to delete course template.")
    }

    setIsConfirmLoading(false)
    setIsConfirmOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-amber-400 mr-2.5" />
        <span className="text-sm font-medium">Loading student course templates...</span>
      </div>
    )
  }

  if (templates.length === 0) {
    if (hideEmptyState) return null
    return (
      <div className='border border-slate-800 bg-[#0a101f]/60 rounded-2xl p-16 text-center'>
        <GraduationCap className="h-8 w-8 text-slate-600 mx-auto mb-2" />
        <p className='text-slate-400 text-sm font-medium'>No student course templates found. Create a new one to get started.</p>
      </div>
    )
  }

  if (filteredTemplates.length === 0) {
    if (hideEmptyState) return null
    return (
      <div className='border border-slate-800 bg-[#0a101f]/60 rounded-2xl p-16 text-center'>
        <p className='text-slate-400 text-sm'>No course templates match &quot;{searchQuery}&quot;</p>
      </div>
    )
  }
  
  return (
    <>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>
        {filteredTemplates.map(template => (
          <CourseTemplateCard 
            key={template.course_id as number} 
            template={template} 
            setIsConfirmOpen={setIsConfirmOpen} 
            setSelectedCourseId={setSelectedCourseId} 
          />
        ))}
      </div>

      <ConfirmationModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => handleDelete(selectedCourseId)}
        variant="destructive"
        title="Delete Course Template"
        description="Are you sure you want to permanently delete this course template? This action is irreversible and will delete this template, all student clearance records, sign-offs, and associated tasks across all databases."
        confirmLabel="Yes, Delete Template"
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
    const shortName = shrinkCourseName(template.course_name) || template.course_name;
    const fullName = expandCourseAbbreviation(template.course_name) || template.course_name;

    return (
      <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-5 shadow-xl hover:border-slate-700/80 transition-ui flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className='flex items-start justify-between gap-3 mb-5'>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex items-center justify-center h-7 px-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold text-xs tracking-wide">
                  {shortName}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Course Template
                </span>
              </div>
              <h3 className='text-base font-bold text-white truncate' title={fullName}>
                {fullName}
              </h3>
            </div>

            <button 
              type="button"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Delete this template"
              onClick={() => { 
                setIsConfirmOpen(true); 
                setSelectedCourseId(template.course_id as number); 
              }}
            >
              <Trash2 className='w-4 h-4' />
            </button>
          </div>

          {/* Completion Rate & Enrolled Stats */}
          <div className="grid grid-cols-2 gap-3 mb-5 p-3 rounded-xl bg-[#070c18] border border-slate-800/80">
            <div>
              <span className='text-[11px] font-semibold text-slate-400 block mb-1'>
                Completion Rate
              </span>
              <div className="flex items-center gap-2">
                <div className='flex-1 h-2 bg-slate-800 rounded-full overflow-hidden'>
                  <div 
                    className={`h-full rounded-full transition-ui duration-200 ${getProgressBarColor(template.completion_rate)}`}
                    style={{ width: `${template.completion_rate}%` }}
                  />
                </div>
                <span className='text-xs font-bold text-white font-mono'>
                  {template.completion_rate}%
                </span>
              </div>
            </div>

            <div className="border-l border-slate-800/80 pl-3">
              <span className='text-[11px] font-semibold text-slate-400 block mb-1'>
                Students Enrolled
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <GraduationCap className="h-4 w-4 text-amber-400/90" />
                <span>{template.students_enrolled}</span>
              </div>
            </div>
          </div>

          {/* Phased Sign-off Sequence */}
          <div className='space-y-2'>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Layers className="h-3.5 w-3.5 text-amber-400" />
                <span>Phased Sign-Off Pipeline</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {template.departments.length} {template.departments.length === 1 ? 'Office' : 'Offices'}
              </span>
            </div>

            <div className='space-y-2'>
              {template.departments.length > 0 ? (
                (() => {
                  const tiers = Array.from(new Set(template.departments.map(d => d.tier || 1))).sort((a, b) => a - b);
                  return tiers.map(tierNum => {
                    const depts = template.departments.filter(d => (d.tier || 1) === tierNum);
                    const isFirst = tierNum === 1;
                    const isLast = tierNum === Math.max(...tiers);

                    return (
                      <div 
                        key={tierNum} 
                        className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl bg-[#070c18] border border-slate-800/80 p-2.5"
                      >
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md shrink-0 w-fit ${
                          isFirst
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : isLast
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          Phase {tierNum}
                        </span>

                        <div className="flex flex-wrap gap-1.5 items-center min-w-0">
                          {depts.map(dept => {
                            const DeptIcon = getDepartmentIcon(dept.icon_name, dept.dept_name);

                            return (
                              <span
                                key={dept.dept_id}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-200 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg"
                              >
                                <DeptIcon className="h-3 w-3 text-amber-400/90 shrink-0" />
                                <span>{dept.dept_name}</span>
                                {dept.staff_name && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    · {dept.staff_name}
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div className='text-xs text-slate-500 italic py-2 text-center border border-dashed border-slate-800 rounded-xl'>
                  No departments assigned to this course
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
}
