'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useFetchCourses } from '@/hooks/admin/courses'
import { useFetchDepartments } from '@/hooks/admin/departments'
import {
  useFetchCourseTemplates,
  useDeleteTemplates,
} from '@/hooks/admin/course-templates'
import {
  useFetchStaffTemplates,
  useDeleteStaffTemplates,
} from '@/hooks/admin/staff-templates'
import CreateTemplateModal, { type EditTemplateData } from '@/components/admin/create-template-modal'
import ConfirmationModal, { type ImpactWarningInfo } from '@/components/admin/confirmation-modal'
import TablePaginationFooter from '@/components/admin/table-pagination-footer'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import {
  Plus,
  ChevronDown,
  GraduationCap,
  Briefcase,
  Layers,
  Loader2,
  MoreVertical,
  Trash2,
  Pencil,
} from 'lucide-react'
import { expandCourseAbbreviation, shrinkCourseName, getProgressBarColor } from '@/utils/formatters'
import { CourseTemplateStats } from '@/types/admin'

type TemplateTab = 'all' | 'students' | 'staff'

const PAGE_SIZE = 10

interface UnifiedTemplateItem {
  id: string | number
  type: 'student' | 'staff'
  name: string
  code: string
  courseId?: number
  deptIds?: number[]
  enrolled: number
  completionRate: number
  departments: {
    dept_id: number
    dept_name: string
    tier?: number
    staff_id?: string | null
    staff_name?: string | null
    icon_name?: string
  }[]
  rawItem: CourseTemplateStats
}

function PhasesBadgeList({
  departments,
}: {
  departments: {
    dept_id: number
    dept_name: string
    tier?: number
    staff_id?: string | null
    staff_name?: string | null
    icon_name?: string
  }[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const measurerRef = useRef<HTMLDivElement>(null)
  const moreBtnMeasurerRef = useRef<HTMLSpanElement>(null)

  // Order phases ascending by tier, then alphabetically by dept_name
  const sortedDepts = useMemo(() => {
    return [...departments].sort(
      (a, b) => (a.tier ?? 1) - (b.tier ?? 1) || a.dept_name.localeCompare(b.dept_name)
    )
  }, [departments])

  const [visibleCount, setVisibleCount] = useState<number>(() =>
    Math.min(3, sortedDepts.length)
  )

  useEffect(() => {
    const container = containerRef.current
    const measurer = measurerRef.current
    if (!container || !measurer) return

    const update = () => {
      const containerWidth = container.clientWidth
      if (containerWidth <= 0) return

      const childElements = Array.from(measurer.children).filter(
        (el) => el !== moreBtnMeasurerRef.current
      ) as HTMLElement[]
      if (childElements.length === 0) return

      const gap = 6 // gap-1.5 = 6px
      const moreBtnWidth = moreBtnMeasurerRef.current?.offsetWidth || 65

      // Check if all items fit without "+ N more"
      let totalAllWidth = 0
      for (let i = 0; i < childElements.length; i++) {
        totalAllWidth += childElements[i].offsetWidth + (i > 0 ? gap : 0)
      }

      if (totalAllWidth <= containerWidth) {
        setVisibleCount(sortedDepts.length)
        return
      }

      // If not all fit, find how many fit along with the "+ N more" button
      let currentWidth = 0
      let count = 0

      for (let i = 0; i < childElements.length; i++) {
        const itemWidth = childElements[i].offsetWidth
        const nextWidth = currentWidth + (i > 0 ? gap : 0) + itemWidth

        if (nextWidth + gap + moreBtnWidth <= containerWidth) {
          currentWidth = nextWidth
          count = i + 1
        } else {
          break
        }
      }

      setVisibleCount(Math.max(1, count))
    }

    update()

    const observer = new ResizeObserver(() => {
      update()
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [sortedDepts])

  if (sortedDepts.length === 0) {
    return <span className="text-xs text-slate-500 italic">No phases configured</span>
  }

  return (
    <div className="relative w-full min-w-0">
      {/* Hidden offscreen measurer for exact badge widths */}
      <div
        ref={measurerRef}
        aria-hidden="true"
        className="absolute -top-[9999px] -left-[9999px] invisible pointer-events-none flex items-center gap-1.5 flex-nowrap"
      >
        {sortedDepts.map((d, i) => (
          <span
            key={d.dept_id || i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px]"
          >
            <span className="font-bold text-[9px] font-mono">P{d.tier ?? 1}</span>
            <span className="max-w-[120px] truncate">{d.dept_name}</span>
          </span>
        ))}
        <span
          ref={moreBtnMeasurerRef}
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono"
        >
          +{sortedDepts.length} more
        </span>
      </div>

      {/* Visible single-line container (strictly constrained height and width) */}
      <div
        ref={containerRef}
        className="flex items-center gap-1.5 flex-nowrap overflow-hidden h-7 w-full min-w-0"
      >
        {sortedDepts.slice(0, visibleCount).map((d, i) => (
          <span
            key={d.dept_id || i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-300 shrink-0 select-none"
            title={`Phase ${d.tier ?? 1}: ${d.dept_name}${d.staff_name ? ` · Officer: ${d.staff_name}` : ''}`}
          >
            <span className="font-bold text-[9px] text-amber-400/90 font-mono">
              P{d.tier ?? 1}
            </span>
            <span className="truncate max-w-[120px]">{d.dept_name}</span>
          </span>
        ))}

        {visibleCount < sortedDepts.length && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-[10px] text-slate-300 hover:text-white font-mono font-medium transition cursor-pointer shrink-0 select-none"
                title={`Click to view all ${sortedDepts.length} phases`}
              >
                +{sortedDepts.length - visibleCount} more
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-72 border border-slate-800 bg-[#0a101f] text-slate-200 shadow-2xl rounded-xl p-3 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-xs font-semibold text-white mb-2 pb-1.5 border-b border-slate-800 flex items-center justify-between">
                <span>Clearance Phases</span>
                <span className="text-[10px] text-slate-400 font-mono font-normal">
                  {sortedDepts.length} departments
                </span>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {sortedDepts.map((d, idx) => (
                  <div
                    key={d.dept_id || idx}
                    className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-400 font-mono shrink-0">
                        P{d.tier ?? 1}
                      </span>
                      <span className="text-slate-200 font-medium truncate text-xs">
                        {d.dept_name}
                      </span>
                    </div>
                    {d.staff_name && (
                      <span
                        className="text-[10px] text-slate-400 font-mono truncate shrink-0 max-w-[100px]"
                        title={d.staff_name}
                      >
                        {d.staff_name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  )
}

export default function Templates() {
  // ————————————————————————————————————————
  // Core State
  // ————————————————————————————————————————
  const [activeTab, setActiveTab] = useState<TemplateTab>('all')
  const [page, setPage] = useState(1)

  // Modal triggers
  const [isStudentTemplateModalOpen, setStudentTemplateModalOpen] = useState(false)
  const [isStaffTemplateModalOpen, setStaffTemplateModalOpen] = useState(false)

  // Edit state
  const [editingTemplate, setEditingTemplate] = useState<UnifiedTemplateItem | null>(null)

  // Memoized edit data objects to guarantee stable reference equality
  const studentEditData = useMemo<EditTemplateData | null>(() => {
    if (!editingTemplate || editingTemplate.type !== 'student') return null
    return {
      courseId: editingTemplate.courseId,
      name: editingTemplate.name,
      departments: editingTemplate.departments,
    }
  }, [editingTemplate])

  const staffEditData = useMemo<EditTemplateData | null>(() => {
    if (!editingTemplate || editingTemplate.type !== 'staff') return null
    return {
      name: editingTemplate.name,
      departments: editingTemplate.departments,
    }
  }, [editingTemplate])

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<UnifiedTemplateItem | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteImpact, setDeleteImpact] = useState<ImpactWarningInfo | null>(null)

  // Fetch pre-flight impact when deleteTarget is selected
  useEffect(() => {
    if (!deleteTarget) {
      setDeleteImpact(null)
      return
    }

    let isMounted = true
    const fetchImpact = async () => {
      try {
        const params = new URLSearchParams()
        if (deleteTarget.courseId) params.set('courseId', String(deleteTarget.courseId))
        params.set('type', deleteTarget.type)

        const res = await fetch(`/api/admin/clearance-templates/impact?${params.toString()}`)
        if (res.ok) {
          const json = await res.json()
          if (isMounted) {
            const rawCode = deleteTarget.code || deleteTarget.name
            const keyword = rawCode ? rawCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : 'CONFIRM'
            setDeleteImpact({
              enrolledCount: json.enrolledCount ?? deleteTarget.enrolled,
              signedCount: json.signedCount ?? 0,
              tasksCount: json.tasksCount ?? 0,
              confirmationKeyword: json.signedCount > 0 ? keyword : undefined,
            })
          }
        }
      } catch {
        if (isMounted) {
          const estSigned = Math.round(
            (deleteTarget.enrolled * (deleteTarget.departments?.length || 1) * deleteTarget.completionRate) / 100
          )
          setDeleteImpact({
            enrolledCount: deleteTarget.enrolled,
            signedCount: estSigned,
            tasksCount: 0,
            confirmationKeyword: estSigned > 0 ? (deleteTarget.code || 'CONFIRM') : undefined,
          })
        }
      }
    }

    fetchImpact()
    return () => {
      isMounted = false
    }
  }, [deleteTarget])

  // ————————————————————————————————————————
  // Hooks & Queries
  // ————————————————————————————————————————
  const { data: courses = [] } = useFetchCourses()
  const { data: departments = [] } = useFetchDepartments()
  const { data: courseTemplates = [], isLoading: isLoadingCourses } = useFetchCourseTemplates()
  const { data: staffTemplates = [], isLoading: isLoadingStaff } = useFetchStaffTemplates()

  const deleteCourseMutation = useDeleteTemplates()
  const deleteStaffMutation = useDeleteStaffTemplates()

  // Reset pagination when active tab changes
  const handleTabChange = (tab: TemplateTab) => {
    setActiveTab(tab)
    setPage(1)
  }

  // Unified Template Items
  const studentItems: UnifiedTemplateItem[] = useMemo(() => {
    return courseTemplates.map((t) => {
      const fullName = expandCourseAbbreviation(t.course_name) || t.course_name
      const shortCode =
        shrinkCourseName(t.course_name) ||
        (expandCourseAbbreviation(t.course_name) ? t.course_name : shrinkCourseName(fullName) || t.course_name)

      return {
        id: t.course_id as number,
        type: 'student',
        name: fullName,
        code: shortCode,
        courseId: t.course_id as number,
        enrolled: t.students_enrolled || 0,
        completionRate: t.completion_rate || 0,
        departments: (t.departments || [])
          .map((d: any) => ({
            dept_id: d.dept_id,
            dept_name: d.dept_name,
            tier: d.tier ?? 1,
            staff_id: d.staff_id,
            staff_name: d.staff_name,
            icon_name: d.icon_name,
          }))
          .sort(
            (a: any, b: any) =>
              (a.tier ?? 1) - (b.tier ?? 1) || a.dept_name.localeCompare(b.dept_name)
          ),
        rawItem: t,
      }
    })
  }, [courseTemplates])

  const staffItems: UnifiedTemplateItem[] = useMemo(() => {
    return staffTemplates.map((t, idx) => ({
      id: `staff-${idx}`,
      type: 'staff',
      name: t.course_name || 'Staff Clearance',
      code: 'STAFF',
      deptIds: t.departments?.map((d) => d.dept_id) || [],
      enrolled: t.students_enrolled || 0,
      completionRate: t.completion_rate || 0,
      departments: (t.departments || [])
        .map((d: any) => ({
          dept_id: d.dept_id,
          dept_name: d.dept_name,
          tier: d.tier ?? 1,
          staff_id: d.staff_id,
          staff_name: d.staff_name,
          icon_name: d.icon_name,
        }))
        .sort(
          (a: any, b: any) =>
            (a.tier ?? 1) - (b.tier ?? 1) || a.dept_name.localeCompare(b.dept_name)
        ),
      rawItem: t,
    }))
  }, [staffTemplates])

  const displayItems = useMemo(() => {
    if (activeTab === 'students') return studentItems
    if (activeTab === 'staff') return staffItems
    return [...staffItems, ...studentItems]
  }, [activeTab, studentItems, staffItems])

  const totalTemplatesCount = courseTemplates.length + staffTemplates.length
  const totalPages = Math.ceil(displayItems.length / PAGE_SIZE) || 1
  const paginatedItems = displayItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const isLoading = isLoadingCourses || isLoadingStaff

  // ————————————————————————————————————————
  // Toast Notification
  // ————————————————————————————————————————
  const { success, error } = useToast()

  // ————————————————————————————————————————
  // Edit Handler
  // ————————————————————————————————————————
  const handleStartEdit = (item: UnifiedTemplateItem) => {
    setEditingTemplate(item)
    if (item.type === 'staff') {
      setStaffTemplateModalOpen(true)
    } else {
      setStudentTemplateModalOpen(true)
    }
  }

  // ————————————————————————————————————————
  // Delete Handler
  // ————————————————————————————————————————
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      if (deleteTarget.type === 'student' && deleteTarget.courseId) {
        await deleteCourseMutation.mutateAsync(deleteTarget.courseId)
        success(`Template for "${deleteTarget.name}" deleted successfully.`)
      } else if (deleteTarget.type === 'staff' && deleteTarget.deptIds) {
        await deleteStaffMutation.mutateAsync(deleteTarget.deptIds)
        success('Staff clearance template deleted successfully.')
      }
      setIsConfirmOpen(false)
      setDeleteTarget(null)
    } catch (err: any) {
      console.error('Delete failed:', err)
      error(err.message || 'Failed to delete template. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* ── 1. Top Header Row ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
              Clearance Templates
            </h1>
            <p className="text-sm text-slate-400">
              Configure sequential signing workflows and clearance phases for students and staff
            </p>
          </div>

          {/* Create Template Dropdown (Primary CTA) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-sm shadow-md shadow-amber-500/20 transition-ui cursor-pointer self-start sm:self-auto"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Create Template</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70 ml-0.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-[#0a101f] border-slate-800 text-slate-200 shadow-2xl rounded-xl p-1.5 z-50"
            >
              <DropdownMenuItem
                onClick={() => {
                  setEditingTemplate(null)
                  setStudentTemplateModalOpen(true)
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 cursor-pointer transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <GraduationCap className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-white">Student Course</p>
                  <p className="text-[10px] text-slate-400 font-normal">Degree program template</p>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-slate-800/80 my-1" />

              <DropdownMenuItem
                onClick={() => {
                  setEditingTemplate(null)
                  setStaffTemplateModalOpen(true)
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 cursor-pointer transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Briefcase className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-white">Staff Template</p>
                  <p className="text-[10px] text-slate-400 font-normal">Campus employee clearance</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── 2. Filter Buttons (Appropriate hugging width) ── */}
        <div className="inline-flex w-fit items-center rounded-xl border border-slate-800 bg-[#070c18] p-1 gap-1 overflow-x-auto">
          {/* All */}
          <button
            type="button"
            onClick={() => handleTabChange('all')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-ui cursor-pointer ${
              activeTab === 'all'
                ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300 font-semibold shadow-xs'
                : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium'
            }`}
          >
            <span>All</span>
            <span
              className={`text-[11px] ${
                activeTab === 'all' ? 'text-amber-400/80 font-mono' : 'text-slate-500 font-mono'
              }`}
            >
              ({totalTemplatesCount})
            </span>
          </button>

          {/* Students */}
          <button
            type="button"
            onClick={() => handleTabChange('students')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-ui cursor-pointer ${
              activeTab === 'students'
                ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300 font-semibold shadow-xs'
                : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium'
            }`}
          >
            <GraduationCap
              className={`h-3.5 w-3.5 ${activeTab === 'students' ? 'text-amber-400' : 'text-slate-500'}`}
            />
            <span>Student</span>
            <span
              className={`text-[11px] ${
                activeTab === 'students' ? 'text-amber-400/80 font-mono' : 'text-slate-500 font-mono'
              }`}
            >
              ({courseTemplates.length})
            </span>
          </button>

          {/* Staff */}
          <button
            type="button"
            onClick={() => handleTabChange('staff')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-ui cursor-pointer ${
              activeTab === 'staff'
                ? 'border border-amber-500/40 bg-amber-500/15 text-amber-300 font-semibold shadow-xs'
                : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium'
            }`}
          >
            <Briefcase
              className={`h-3.5 w-3.5 ${activeTab === 'staff' ? 'text-emerald-400' : 'text-slate-500'}`}
            />
            <span>Staff</span>
            <span
              className={`text-[11px] ${
                activeTab === 'staff' ? 'text-emerald-400/80 font-mono' : 'text-slate-500 font-mono'
              }`}
            >
              ({staffTemplates.length})
            </span>
          </button>
        </div>

        {/* ── 3. Compact Templates Table Card (Matching Departments Page Design) ── */}
        <div className="rounded-2xl border border-slate-800 bg-[#0a101f] shadow-2xl overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <colgroup>
                <col className="w-auto min-w-[260px]" />
                <col className="w-36" />
                <col className="w-44" />
                <col className="w-auto min-w-[240px]" />
                <col className="w-14" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-800 bg-[#070c18]">
                  <th className="px-6 py-4 text-left text-[11px] font-bold tracking-wider uppercase text-slate-400">
                    CLEARANCE TEMPLATE
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold tracking-wider uppercase text-slate-400">
                    CLIENTS
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold tracking-wider uppercase text-slate-400">
                    PROGRESS
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold tracking-wider uppercase text-slate-400">
                    PHASES
                  </th>
                  <th className="px-6 py-4 text-right w-14">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-sm text-slate-400">
                      <div className="flex items-center justify-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                        <span>Loading clearance templates...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-sm text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Layers className="h-8 w-8 text-slate-600 mb-1" />
                        <p className="font-medium text-slate-300">
                          {activeTab === 'students'
                            ? 'No student course templates found.'
                            : activeTab === 'staff'
                              ? 'No staff clearance templates found.'
                              : 'No clearance templates found.'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Click &quot;Create Template&quot; above to configure a new clearance workflow.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => {
                    const isStaff = item.type === 'staff'

                    return (
                      <tr
                        key={item.id}
                        className="group border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
                      >
                        {/* 1. Template Title & Badge */}
                        <td className="px-6 py-4 text-left">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-inner transition-ui ${
                                isStaff
                                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/20'
                                  : 'border-amber-500/20 bg-amber-500/10 text-amber-400 group-hover:border-amber-500/40 group-hover:bg-amber-500/20'
                              }`}
                            >
                              {isStaff ? (
                                <Briefcase className="h-5 w-5" />
                              ) : (
                                <GraduationCap className="h-5 w-5" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="font-semibold text-slate-100 text-sm truncate"
                                  title={item.name}
                                >
                                  {item.name}
                                </span>
                                {item.code && (
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                      isStaff
                                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                    }`}
                                  >
                                    {item.code}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Client Count Column (Vertically aligned) */}
                        <td className="px-6 py-4 text-left whitespace-nowrap">
                          <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                            {isStaff ? (
                              <Briefcase className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            ) : (
                              <GraduationCap className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            )}
                            <span>
                              <strong className="text-white font-semibold">{item.enrolled}</strong>{' '}
                              {isStaff ? 'Staff' : 'Students'}
                            </span>
                          </div>
                        </td>

                        {/* 3. Progress Column (Vertically aligned) */}
                        <td className="px-6 py-4 text-left whitespace-nowrap">
                          <div className="flex items-center gap-2.5 font-mono text-xs text-slate-300">
                            <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden shrink-0">
                              <div
                                className={`h-full rounded-full transition-ui duration-200 ${getProgressBarColor(item.completionRate)}`}
                                style={{ width: `${item.completionRate}%` }}
                              />
                            </div>
                            <span className="text-white font-semibold">
                              {item.completionRate}%
                            </span>
                          </div>
                        </td>

                        {/* 4. Phases Column (Vertically aligned) */}
                        <td className="px-6 py-4 text-left">
                          <PhasesBadgeList departments={item.departments} />
                        </td>

                        {/* 5. Dropdown Actions Column */}
                        <td className="px-6 py-4 text-right whitespace-nowrap w-14">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer ml-auto"
                                title="Template options"
                              >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-44 border border-slate-800 bg-[#0a101f] text-slate-200 shadow-xl rounded-xl p-1"
                            >
                              <DropdownMenuItem
                                onClick={() => handleStartEdit(item)}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg cursor-pointer"
                              >
                                <Pencil className="h-3.5 w-3.5 text-amber-400" />
                                <span>Edit Template</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-800/80 my-1" />
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeleteTarget(item)
                                  setIsConfirmOpen(true)
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                                <span>Delete Template</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-slate-800/60">
            {isLoading ? (
              <div className="px-6 py-16 text-center text-sm text-slate-400">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-amber-400 mb-2" />
                Loading clearance templates...
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-slate-400">
                <Layers className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="font-medium text-slate-300">No clearance templates found.</p>
              </div>
            ) : (
              paginatedItems.map((item) => {
                const isStaff = item.type === 'staff'

                return (
                  <div
                    key={item.id}
                    className="p-4 space-y-3 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-inner ${
                            isStaff
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                              : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {isStaff ? (
                            <Briefcase className="h-5 w-5" />
                          ) : (
                            <GraduationCap className="h-5 w-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-100 truncate">
                              {item.name}
                            </p>
                            {item.code && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  isStaff
                                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                }`}
                              >
                                {item.code}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ellipsis Dropdown for Mobile */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors cursor-pointer shrink-0"
                            title="Template options"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-44 border border-slate-800 bg-[#0a101f] text-slate-200 shadow-xl rounded-xl p-1"
                        >
                          <DropdownMenuItem
                            onClick={() => handleStartEdit(item)}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5 text-amber-400" />
                            <span>Edit Template</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-800/80 my-1" />
                          <DropdownMenuItem
                            onClick={() => {
                              setDeleteTarget(item)
                              setIsConfirmOpen(true)
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                            <span>Delete Template</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Aligned details grid */}
                    <div className="grid grid-cols-2 gap-3 pl-[52px] font-mono text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="text-slate-500">Clients:</span>
                        <span className="text-white font-semibold">
                          {item.enrolled} {isStaff ? 'Staff' : 'Students'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="text-slate-500">Cleared:</span>
                        <span className="text-white font-semibold">
                          {item.completionRate}%
                        </span>
                      </div>
                    </div>

                    {item.departments.length > 0 && (
                      <div className="pl-[52px]">
                        <PhasesBadgeList departments={item.departments} />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Pagination Footer */}
          <TablePaginationFooter
            currentPage={page}
            pageSize={PAGE_SIZE}
            totalItems={displayItems.length}
            itemLabel={displayItems.length === 1 ? 'template' : 'templates'}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* ── Modals ── */}
      <CreateTemplateModal
        mode="student"
        open={isStudentTemplateModalOpen}
        onOpenChange={(open) => {
          setStudentTemplateModalOpen(open)
          if (!open) setEditingTemplate(null)
        }}
        courses={courses}
        departments={departments}
        toastSuccess={success}
        toastError={error}
        editData={studentEditData}
      />

      <CreateTemplateModal
        mode="staff"
        open={isStaffTemplateModalOpen}
        onOpenChange={(open) => {
          setStaffTemplateModalOpen(open)
          if (!open) setEditingTemplate(null)
        }}
        courses={courses}
        departments={departments}
        toastSuccess={success}
        toastError={error}
        editData={staffEditData}
      />

      {/* Confirmation Modal for Delete */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false)
          setDeleteTarget(null)
        }}
        onConfirm={handleConfirmDelete}
        variant="destructive"
        title={
          deleteTarget?.type === 'staff'
            ? 'Delete Staff Clearance Template?'
            : `Delete Template for ${deleteTarget?.code || 'Course'}?`
        }
        description="Are you sure you want to delete this clearance template? This action is irreversible and will remove configured signing requirements."
        confirmLabel="Yes, Delete Template"
        isLoading={isDeleting}
        impactInfo={deleteImpact}
      />
    </>
  )
}
