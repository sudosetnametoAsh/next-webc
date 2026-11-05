'use client'

import { useTermManagement } from './use-term-management'
import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useFetchAdminStats } from '@/hooks/admin/fetch-stats'
import { useFetchStudentTemplates } from '@/hooks/admin/student-templates'
import { useFetchCourseTemplates } from '@/hooks/admin/course-templates'
import { useFetchCourses } from '@/hooks/admin/courses'
import { useFetchStaff } from '@/hooks/admin/fetch-staff'
import { useFetchStaffTemplates } from '@/hooks/admin/staff-templates'
import { useFetchDepartments } from '@/hooks/admin/departments'
import { Departments } from '@/types/admin'
import { expandCourseAbbreviation, shrinkCourseName } from '@/utils/formatters'
import ClientFilterToolbar, { ClientType, ClientStatus, formatSectionCode } from '@/components/admin/client-filter-toolbar'
import ClientClearanceOverlay, { DepartmentClearanceProgress } from '@/components/admin/client-clearance-overlay'
import ClientDirectoryTable from './client-directory-table'
import ClientEnrollmentModal from '@/components/admin/client-enrollment-modal'
import ClientActions from '@/components/admin/client-actions'
import DeleteSelectedClients from '@/components/admin/delete-selected-clients'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { isClearanceOverdue } from '@/lib/clearance-overdue'
import { computeClientOverdueStatus } from '@/lib/clearance-logic'
import { UserPlus } from 'lucide-react'

// ———— TYPES ————————————————————————————————————————————————————————————————————————————————————————————————

type Props = {
  setAdminPage?: (adminPage: string) => void
}

export type ClientItem = {
  id: string
  name: string
  email?: string | null
  type: 'student' | 'staff'
  overallStatus: 'Incomplete' | 'Pending' | 'Signed'
  totalDepartments: number
  signedDepartments: number
  courseId?: number
  courseName?: string
  courseYear?: number
  sectionNumber?: number | string
  semester?: number
  sectionId?: number | string
  sectionCode?: string
  pendingDepartments: Departments[]
  departments: DepartmentClearanceProgress[]
  isOverdue?: boolean
  overduePhase?: number | null
  overduePhaseLabel?: string | null
  dwellHours?: number
}

// ———— CONSTANTS ————————————————————————————————————————————————————————————————————————————————————————————————

const PAGE_SIZE = 10

// ———— HELPER FUNCTIONS & SUB-COMPONENTS ——————————————————————————————————————————————————————————————————————

// ———— MAIN COMPONENT CONTENT ——————————————————————————————————————————————————————————————————————————————————————

function AdminClientsContent({ setAdminPage }: Props) {
  const searchParams = useSearchParams()

  const initialType = searchParams.get('type')
  const initialStatus = searchParams.get('status')
  const initialCourse = searchParams.get('course')
  const initialSection = searchParams.get('section')
  const initialPhase = searchParams.get('phase')
  const initialDepartment = searchParams.get('department') || searchParams.get('dept')

  // Filter States initialized with searchParams if present
  const [clientType, setClientType] = useState<ClientType>(() => {
    if (initialType === 'students' || initialType === 'staff' || initialType === 'all') {
      return initialType
    }
    return 'all'
  })
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<ClientStatus>(() => {
    if (
      initialStatus === 'overdue' ||
      initialStatus === 'in-progress' ||
      initialStatus === 'no-template' ||
      initialStatus === 'pending' ||
      initialStatus === 'cleared' ||
      initialStatus === 'all'
    ) {
      return initialStatus
    }
    return 'all'
  })
  const [phaseFilter, setPhaseFilter] = useState<string>(() => {
    if (initialPhase && initialPhase.trim()) {
      return initialPhase.trim()
    }
    return 'all'
  })
  const [departmentFilter, setDepartmentFilter] = useState<string>(() => {
    if (initialDepartment && initialDepartment.trim()) {
      return initialDepartment.trim()
    }
    return 'all'
  })
  const [courseFilter, setCourseFilter] = useState<string>(() => {
    if (initialCourse && initialCourse.trim()) {
      return initialCourse.trim()
    }
    return 'all'
  })
  const [sectionFilter, setSectionFilter] = useState<string>(() => {
    if (initialSection && initialSection.trim()) {
      return initialSection.trim()
    }
    return 'all'
  })
  const [studentPage, setStudentPage] = useState(1)
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false)
  const { success, error } = useToast()

  // Data Hooks
  const { isLoading: isLoadingAdminStats } = useFetchAdminStats()
  const { data: courseTemplates = [], isLoading: isLoadingCourseTemplates } = useFetchCourseTemplates()
  const { data: studentTemplates = [], isLoading: isLoadingStudentTemplates } = useFetchStudentTemplates()
  const { data: coursesData = [] } = useFetchCourses()
  const { data: staffList = [] } = useFetchStaff()
  const { data: staffTemplates = [] } = useFetchStaffTemplates()
  const { data: departmentsData = [] } = useFetchDepartments()

  // Sync if URL search params change dynamically
  useEffect(() => {
    const typeParam = searchParams.get('type')
    if (typeParam === 'students' || typeParam === 'staff' || typeParam === 'all') {
      setClientType(typeParam)
    }
    const statusParam = searchParams.get('status')
    if (
      statusParam === 'overdue' ||
      statusParam === 'in-progress' ||
      statusParam === 'no-template' ||
      statusParam === 'pending' ||
      statusParam === 'cleared' ||
      statusParam === 'all'
    ) {
      setSelectedStatus(statusParam)
    }
    const courseParam = searchParams.get('course')
    if (courseParam) {
      setCourseFilter(courseParam)
    }
    const sectionParam = searchParams.get('section')
    if (sectionParam) {
      setSectionFilter(sectionParam)
    }
    const phaseParam = searchParams.get('phase')
    if (phaseParam) {
      setPhaseFilter(phaseParam)
    }
    const deptParam = searchParams.get('department') || searchParams.get('dept')
    if (deptParam) {
      setDepartmentFilter(deptParam)
    }
  }, [searchParams])

  // Normalize courseFilter against fetched courses if a short code or abbreviation was passed in URL
  useEffect(() => {
    if (coursesData.length > 0 && courseFilter !== 'all') {
      const match = coursesData.find(
        (c) =>
          c.course_name.toLowerCase() === courseFilter.toLowerCase() ||
          shrinkCourseName(c.course_name).toLowerCase() === courseFilter.toLowerCase() ||
          String(c.course_id) === courseFilter
      )
      if (match && match.course_name !== courseFilter) {
        setCourseFilter(match.course_name)
      }
    }
  }, [coursesData, courseFilter])

  // Normalize departmentFilter against fetched departments if a name or id was passed in URL
  useEffect(() => {
    if (departmentsData.length > 0 && departmentFilter !== 'all') {
      const match = departmentsData.find(
        (d) =>
          d.dept_name.toLowerCase() === departmentFilter.toLowerCase() ||
          String(d.dept_id) === departmentFilter
      )
      if (match && match.dept_name !== departmentFilter) {
        setDepartmentFilter(match.dept_name)
      }
    }
  }, [departmentsData, departmentFilter])

  // Consolidate Students and Staff into Unified Client List with full Department Details
  const unifiedClients: ClientItem[] = useMemo(() => {
    const students: ClientItem[] = (studentTemplates || []).map((s) => {
      // Find course template departments if available
      const matchedTemplate = courseTemplates.find(
        (ct) =>
          (s.course_id !== undefined && ct.course_id === s.course_id) ||
          (s.course_name && ct.course_name && ct.course_name.trim().toLowerCase() === s.course_name.trim().toLowerCase()) ||
          (s.course_name && ct.course_name && shrinkCourseName(ct.course_name).toLowerCase() === shrinkCourseName(s.course_name).toLowerCase())
      )

      // Build complete department list for the student
      let depts: DepartmentClearanceProgress[] = []

      if (s.departments && s.departments.length > 0) {
        depts = s.departments.map((d) => ({
          clearance_id: d.clearance_id,
          dept_id: d.dept_id,
          dept_name: d.dept_name,
          tier: d.tier ?? 1,
          status: d.status,
          signed_at: d.signed_at,
          created_at: d.created_at,
          staff_name: d.staff_name,
          floor: d.floor,
          room: d.room,
          icon_name: d.icon_name,
        }))

        // If template has additional departments not yet in s.departments, add them
        if (matchedTemplate?.departments) {
          for (const tDept of matchedTemplate.departments) {
            if (!depts.some((d) => d.dept_id === tDept.dept_id || d.dept_name.toLowerCase() === tDept.dept_name.toLowerCase())) {
              depts.push({
                dept_id: tDept.dept_id,
                dept_name: tDept.dept_name,
                tier: tDept.tier ?? 1,
                status: 'Incomplete',
                staff_name: tDept.staff_name,
                icon_name: tDept.icon_name,
              })
            }
          }
        }
      } else if (matchedTemplate?.departments && matchedTemplate.departments.length > 0) {
        depts = matchedTemplate.departments.map((d) => {
          const isPending = s.pending_departments?.some(
            (pd) => pd.dept_name.toLowerCase() === d.dept_name.toLowerCase()
          )
          const isSigned = s.overallStatus === 'Signed'
          return {
            dept_id: d.dept_id,
            dept_name: d.dept_name,
            tier: d.tier ?? 1,
            status: isSigned ? ('Signed' as const) : isPending ? ('Pending' as const) : ('Incomplete' as const),
            staff_name: d.staff_name,
            icon_name: d.icon_name,
          }
        })
      } else {
        depts = []
      }

      const totalDepts = depts.length || matchedTemplate?.departments?.length || s.total_departments || 0
      const signedDepts = depts.filter((d) => d.status === 'Signed').length
      const sectionCode =
        s.course_year !== undefined && s.section_number !== undefined
          ? formatSectionCode({
              year: s.course_year,
              semester: s.semester,
              section_number: s.section_number,
            })
          : undefined

      const overdueInfo =
        s.isOverdue !== undefined
          ? {
              isOverdue: s.isOverdue,
              overduePhase: s.overduePhase,
              overduePhaseLabel: s.overduePhaseLabel,
              dwellHours: s.dwellHours ?? 0,
            }
          : computeClientOverdueStatus(s.departments || [], false)

      return {
        id: String(s.student_id),
        name: s.student_name,
        type: 'student' as const,
        overallStatus: s.overallStatus,
        totalDepartments: totalDepts,
        signedDepartments: signedDepts,
        courseId: s.course_id,
        courseName: s.course_name,
        courseYear: s.course_year,
        sectionNumber: s.section_number,
        semester: s.semester,
        sectionId: s.section_id,
        sectionCode,
        pendingDepartments: s.pending_departments || [],
        departments: depts,
        isOverdue: overdueInfo.isOverdue,
        overduePhase: overdueInfo.overduePhase,
        overduePhaseLabel: overdueInfo.overduePhaseLabel,
        dwellHours: overdueInfo.dwellHours,
      }
    })

    const activeStaffTemplate = staffTemplates && staffTemplates.length > 0 ? staffTemplates[0] : null

    const staff: ClientItem[] = (staffList || []).map((st) => {
      let depts: DepartmentClearanceProgress[] = []

      if (st.departments && st.departments.length > 0) {
        depts = st.departments.map((d) => ({
          clearance_id: d.clearance_id,
          dept_id: d.dept_id,
          dept_name: d.dept_name,
          tier: d.tier ?? 1,
          status: d.status,
          signed_at: d.signed_at,
          created_at: d.created_at,
          staff_name: d.staff_name,
          floor: d.floor,
          room: d.room,
          icon_name: d.icon_name,
        }))

        // If staff template has additional departments not yet in st.departments, add them
        if (activeStaffTemplate?.departments) {
          for (const tDept of activeStaffTemplate.departments) {
            if (!depts.some((d) => d.dept_id === tDept.dept_id || d.dept_name.toLowerCase() === tDept.dept_name.toLowerCase())) {
              depts.push({
                dept_id: tDept.dept_id,
                dept_name: tDept.dept_name,
                tier: tDept.tier ?? 1,
                status: 'Incomplete',
                staff_name: tDept.staff_name,
                icon_name: tDept.icon_name,
              })
            }
          }
        }
      } else if (activeStaffTemplate?.departments && activeStaffTemplate.departments.length > 0) {
        depts = activeStaffTemplate.departments.map((d) => {
          const isPending = st.pending_departments?.some(
            (pd) => pd.dept_name.toLowerCase() === d.dept_name.toLowerCase()
          )
          const isSigned = st.overallStatus === 'Signed'
          return {
            dept_id: d.dept_id,
            dept_name: d.dept_name,
            tier: d.tier ?? 1,
            status: isSigned ? ('Signed' as const) : isPending ? ('Pending' as const) : ('Incomplete' as const),
            staff_name: d.staff_name,
            icon_name: d.icon_name,
          }
        })
      } else {
        depts = []
      }

      const totalDepts = depts.length || activeStaffTemplate?.departments?.length || st.total_departments || 0
      const signedDepts = depts.filter((d) => d.status === 'Signed').length

      const staffOverdueInfo =
        st.isOverdue !== undefined
          ? {
              isOverdue: st.isOverdue,
              overduePhase: st.overduePhase,
              overduePhaseLabel: st.overduePhaseLabel,
              dwellHours: st.dwellHours ?? 0,
            }
          : computeClientOverdueStatus(st.departments || [], true)

      return {
        id: String(st.staff_id),
        name: st.staff_name,
        email: st.email,
        type: 'staff' as const,
        overallStatus: st.overallStatus || 'Incomplete',
        totalDepartments: totalDepts,
        signedDepartments: signedDepts,
        pendingDepartments: st.pending_departments || [],
        departments: depts,
        isOverdue: staffOverdueInfo.isOverdue,
        overduePhase: staffOverdueInfo.overduePhase,
        overduePhaseLabel: staffOverdueInfo.overduePhaseLabel,
        dwellHours: staffOverdueInfo.dwellHours,
      }
    })

    return [...students, ...staff]
  }, [studentTemplates, staffList, courseTemplates, staffTemplates])

  // Overdue client candidates based on current clientType, course, and section filters
  const overdueCandidates = useMemo(() => {
    if (selectedStatus !== 'overdue') return []

    let list = unifiedClients.filter((c) => c.isOverdue)

    if (clientType === 'students') {
      list = list.filter((c) => c.type === 'student')
    } else if (clientType === 'staff') {
      list = list.filter((c) => c.type === 'staff')
    }

    if (clientType === 'students' && courseFilter !== 'all') {
      list = list.filter((c) => {
        if (!c.courseName) return false
        return (
          shrinkCourseName(c.courseName).toLowerCase() === courseFilter.toLowerCase() ||
          c.courseName.toLowerCase() === courseFilter.toLowerCase()
        )
      })
    }

    if (clientType === 'students' && sectionFilter !== 'all') {
      list = list.filter(
        (c) =>
          String(c.sectionId) === sectionFilter ||
          (c.sectionCode && c.sectionCode === sectionFilter)
      )
    }

    return list
  }, [unifiedClients, selectedStatus, clientType, courseFilter, sectionFilter])

  // Available Phase tiers: when overdue, only display phases that have overdue clients
  const availablePhases = useMemo(() => {
    if (selectedStatus === 'overdue') {
      let relevant = overdueCandidates
      if (departmentFilter !== 'all') {
        relevant = relevant.filter((c) =>
          c.departments.some((d) => {
            const matchesDept =
              d.dept_name.toLowerCase() === departmentFilter.toLowerCase() ||
              String(d.dept_id) === departmentFilter
            const isInActivePhase = isClearanceOverdue(d, c.departments, c.type === 'staff')
            return matchesDept && isInActivePhase && (phaseFilter === 'all' || String(d.tier ?? 1) === phaseFilter)
          })
        )
      }
      const phases = Array.from(
        new Set(
          relevant.flatMap(c => c.departments
            .filter(d => isClearanceOverdue(d, c.departments, c.type === 'staff'))
            .filter(d => departmentFilter === 'all' || d.dept_name.toLowerCase() === departmentFilter.toLowerCase() || String(d.dept_id) === departmentFilter)
            .map(d => d.tier ?? 1))
        )
      ).sort((a, b) => a - b)

      if (phaseFilter !== 'all') {
        const pNum = Number(phaseFilter)
        if (!isNaN(pNum) && !phases.includes(pNum)) {
          phases.push(pNum)
          phases.sort((a, b) => a - b)
        }
      }

      return phases
    }

    const courseTiers = courseTemplates.flatMap((ct) => ct.departments?.map((d) => d.tier ?? 1) || [])
    const staffTiers = staffTemplates.flatMap((st) => st.departments?.map((d) => d.tier ?? 1) || [])
    const combined = [...courseTiers, ...staffTiers]
    return Array.from(new Set(combined.length > 0 ? combined : [1, 2, 3])).sort((a, b) => a - b)
  }, [selectedStatus, overdueCandidates, departmentFilter, phaseFilter, courseTemplates, staffTemplates])

  // Available departments: when overdue, only display departments that have overdue clients
  const availableDepartments = useMemo(() => {
    if (selectedStatus === 'overdue') {
      let relevant = overdueCandidates
      if (phaseFilter !== 'all') {
        relevant = relevant.filter((c) => c.departments.some(d => String(d.tier ?? 1) === phaseFilter && isClearanceOverdue(d, c.departments, c.type === 'staff')))
      }

      const deptMap = new Map<string, { dept_id: number; dept_name: string; icon_name?: string | null }>()
      relevant.forEach((c) => {
        c.departments.forEach((d) => {
          const isInActivePhase = isClearanceOverdue(d, c.departments, c.type === 'staff')
          if (isInActivePhase && (phaseFilter === 'all' || String(d.tier ?? 1) === phaseFilter) && d.dept_id !== undefined) {
            const key = d.dept_name.toLowerCase()
            if (!deptMap.has(key)) {
              deptMap.set(key, {
                dept_id: d.dept_id,
                dept_name: d.dept_name,
                icon_name: d.icon_name,
              })
            }
          }
        })
      })

      // Ensure explicitly filtered department from URL or selection is retained in available list
      if (departmentFilter !== 'all') {
        const key = departmentFilter.toLowerCase()
        if (!deptMap.has(key)) {
          const matched = (departmentsData || []).find(
            (d) =>
              d.dept_name.toLowerCase() === key ||
              d.dept_name.toLowerCase().includes(key) ||
              key.includes(d.dept_name.toLowerCase()) ||
              String(d.dept_id) === departmentFilter
          )
          if (matched) {
            deptMap.set(key, {
              dept_id: matched.dept_id,
              dept_name: matched.dept_name,
              icon_name: matched.icon_name,
            })
          }
        }
      }

      return Array.from(deptMap.values()).sort((a, b) => a.dept_name.localeCompare(b.dept_name))
    }

    if (departmentsData && departmentsData.length > 0) {
      return departmentsData
    }
    const deptMap = new Map<string, { dept_id: number; dept_name: string; icon_name?: string | null }>()
    unifiedClients.forEach((c) => {
      c.departments.forEach((d) => {
        if (d.dept_id !== undefined && !deptMap.has(d.dept_name.toLowerCase())) {
          deptMap.set(d.dept_name.toLowerCase(), {
            dept_id: d.dept_id,
            dept_name: d.dept_name,
            icon_name: d.icon_name,
          })
        }
      })
    })
    return Array.from(deptMap.values())
  }, [selectedStatus, overdueCandidates, phaseFilter, departmentFilter, departmentsData, unifiedClients])

  // Filtered Clients based on all active controls
  const filteredClients = useMemo(() => {
    let data = [...unifiedClients]

    // 1. Client Type filter
    if (clientType === 'students') {
      data = data.filter((c) => c.type === 'student')
    } else if (clientType === 'staff') {
      data = data.filter((c) => c.type === 'staff')
    }

    // 2. Status filter
    if (selectedStatus === 'no-template') {
      data = data.filter((c) => c.totalDepartments === 0)
    } else if (selectedStatus === 'in-progress') {
      data = data.filter((c) => c.totalDepartments > 0 && c.overallStatus === 'Incomplete')
    } else if (selectedStatus === 'pending') {
      data = data.filter((c) => c.overallStatus === 'Pending')
    } else if (selectedStatus === 'cleared') {
      data = data.filter((c) => c.overallStatus === 'Signed')
    } else if (selectedStatus === 'overdue') {
      data = data.filter((c) => c.isOverdue)
      if (phaseFilter !== 'all') {
        data = data.filter((c) => c.departments.some(d => String(d.tier ?? 1) === phaseFilter && isClearanceOverdue(d, c.departments, c.type === 'staff')))
      }
      if (departmentFilter !== 'all') {
        data = data.filter((c) => {
          return c.departments.some((d) => {
            const deptNameLower = d.dept_name.toLowerCase()
            const filterLower = departmentFilter.toLowerCase()
            const matchesDept =
              deptNameLower === filterLower ||
              String(d.dept_id) === departmentFilter
            const isInActivePhase = isClearanceOverdue(d, c.departments, c.type === 'staff')
            return matchesDept && isInActivePhase && (phaseFilter === 'all' || String(d.tier ?? 1) === phaseFilter)
          })
        })
      }
    }

    // 3. Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      data = data.filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(q)
        const idMatch = c.id.toLowerCase().includes(q)
        const emailMatch = Boolean(c.email?.toLowerCase().includes(q))
        const courseMatch =
          c.courseName &&
          (c.courseName.toLowerCase().includes(q) ||
            shrinkCourseName(c.courseName).toLowerCase().includes(q) ||
            expandCourseAbbreviation(c.courseName).toLowerCase().includes(q))
        const sectionMatch = c.sectionCode && c.sectionCode.toLowerCase().includes(q)
        return nameMatch || idMatch || emailMatch || Boolean(courseMatch) || Boolean(sectionMatch)
      })
    }

    // 4. Course filter (Student-specific)
    if (clientType === 'students' && courseFilter !== 'all') {
      data = data.filter((c) => {
        if (!c.courseName) return false
        return (
          shrinkCourseName(c.courseName).toLowerCase() === courseFilter.toLowerCase() ||
          c.courseName.toLowerCase() === courseFilter.toLowerCase()
        )
      })
    }

    // 5. Section filter (Student-specific)
    if (clientType === 'students' && sectionFilter !== 'all') {
      data = data.filter(
        (c) =>
          String(c.sectionId) === sectionFilter ||
          (c.sectionCode && c.sectionCode === sectionFilter)
      )
    }

    // 6. Default Sort A-Z
    data = data.sort((a, b) => a.name.localeCompare(b.name))

    return data
  }, [
    unifiedClients,
    clientType,
    selectedStatus,
    phaseFilter,
    departmentFilter,
    search,
    courseFilter,
    sectionFilter,
  ])

  // Selection follows the filtered list and remains available across its pages.
  // Keep an open inspection overlay on the current query result, including
  // signatures received from another department while it remains open.
  const liveSelectedClient = selectedClient
    ? unifiedClients.find((client) => client.id === selectedClient.id && client.type === selectedClient.type) ?? null
    : null

  const selectedClients = filteredClients.filter((client) => selectedKeys.has(`${client.type}:${client.id}`))
  const allSelected = filteredClients.length > 0 && selectedClients.length === filteredClients.length
  useEffect(() => {
    const visibleKeys = new Set(filteredClients.map((client) => `${client.type}:${client.id}`))
    setSelectedKeys((previous) => {
      const next = new Set([...previous].filter((key) => visibleKeys.has(key)))
      return next.size === previous.size ? previous : next
    })
  }, [filteredClients])

  const selectionClassName = "relative after:absolute after:-inset-3.5 after:content-[''] cursor-pointer border-slate-700 bg-slate-900/80 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:text-slate-950"
  const selectAllCheckbox = () => (
    <Checkbox aria-label="Select all filtered clients" checked={allSelected ? true : selectedClients.length > 0 ? 'indeterminate' : false} onCheckedChange={(checked) => setSelectedKeys(checked === true ? new Set(filteredClients.map((client) => `${client.type}:${client.id}`)) : new Set())} className={selectionClassName} />
  )
  const clientCheckbox = (client: ClientItem) => (
    <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
      <Checkbox aria-label={`Select ${client.name}`} checked={selectedKeys.has(`${client.type}:${client.id}`)} onCheckedChange={(checked) => setSelectedKeys((previous) => {
        const next = new Set(previous)
        if (checked === true) next.add(`${client.type}:${client.id}`)
        else next.delete(`${client.type}:${client.id}`)
        return next
      })} className={selectionClassName} />
    </div>
  )

  // Pagination slice
  const totalPages = Math.ceil(filteredClients.length / PAGE_SIZE)
  const currentPage = Math.min(studentPage, Math.max(1, totalPages))
  const paginated = filteredClients.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const termManagement = useTermManagement()
  useEffect(() => {
    setSelectedKeys(new Set())
    setSelectedClient(null)
    setStudentPage(1)
  }, [termManagement.periodId])
  if (termManagement.selectionPage) return termManagement.selectionPage

  if (isLoadingAdminStats || isLoadingCourseTemplates || isLoadingStudentTemplates) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-slate-400">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span>Loading clients data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      {/* ── Top Header with Enroll Client Action ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
            Clients
          </h1>
          <p className="text-sm text-slate-400">
            Track clearance progress of students and staff
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        {termManagement.toolbar}
        <button
          type="button"
          onClick={() => setIsEnrollModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-500/20 transition-ui hover:scale-[1.02] active:scale-[0.98] w-fit cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          <span>Enroll Client</span>
        </button>
        </div>
      </div>

      {termManagement.modal}
      {termManagement.error && <p role="alert" className="text-xs text-rose-300">{termManagement.error.message}</p>}
      {/* ── Client Filter Toolbar with Breadcrumbs ── */}
      <ClientFilterToolbar
        allCount={unifiedClients.length}
        studentsCount={unifiedClients.filter((c) => c.type === 'student').length}
        staffCount={unifiedClients.filter((c) => c.type === 'staff').length}
        filteredCount={filteredClients.length}
        clientType={clientType}
        onClientTypeChange={(type) => {
          setClientType(type)
          if (type !== 'students') {
            setCourseFilter('all')
            setSectionFilter('all')
          }
          setPhaseFilter('all')
          setDepartmentFilter('all')
          setStudentPage(1)
        }}
        searchQuery={search}
        onSearchChange={(query) => {
          setSearch(query)
          setStudentPage(1)
        }}
        selectedStatus={selectedStatus}
        onStatusChange={(status) => {
          setSelectedStatus(status)
          if (status !== 'overdue') {
            setDepartmentFilter('all')
            setPhaseFilter('all')
          }
          setStudentPage(1)
        }}
        availableDepartments={availableDepartments}
        selectedDepartment={departmentFilter}
        onDepartmentChange={(dept) => {
          setDepartmentFilter(dept)
          if (dept !== 'all' && phaseFilter !== 'all') {
            setPhaseFilter('all')
          }
          setStudentPage(1)
        }}
        availablePhases={availablePhases}
        selectedPhase={phaseFilter}
        onPhaseChange={(phase) => {
          setPhaseFilter(phase)
          if (phase !== 'all' && departmentFilter !== 'all') {
            setDepartmentFilter('all')
          }
          setStudentPage(1)
        }}
        courses={coursesData}
        selectedCourse={courseFilter}
        onCourseChange={(course) => {
          setCourseFilter(course)
          setSectionFilter('all')
          setStudentPage(1)
        }}
        selectedSection={sectionFilter}
        onSectionChange={(section) => {
          setSectionFilter(section)
          setStudentPage(1)
        }}
      />

      <p role="status" aria-live="polite" aria-atomic="true" className="shrink-0 px-1 text-xs text-slate-400">
        <span className="tabular-nums">{selectedClients.length}</span>{' '}
        {selectedClients.length === 1 ? 'client' : 'clients'} selected
      </p>

      {selectedClients.length > 0 && <DeleteSelectedClients clients={selectedClients} onDeleted={(keys) => {
        setSelectedKeys((previous) => new Set([...previous].filter((key) => !keys.includes(key))))
        setSelectedClient((current) => current && keys.includes(`${current.type}:${current.id}`) ? null : current)
      }} />}

      <ClientDirectoryTable clients={paginated} totalItems={filteredClients.length} currentPage={currentPage} pageSize={PAGE_SIZE} onPageChange={setStudentPage} selectAllCheckbox={selectAllCheckbox} clientCheckbox={clientCheckbox} onClientClick={setSelectedClient} />

      {/* ── Client Clearance Sidebar Overlay ── */}
      <ClientClearanceOverlay
        client={liveSelectedClient}
        actions={liveSelectedClient && (
          <ClientActions
            key={`${liveSelectedClient.type}-${liveSelectedClient.id}`}
            client={liveSelectedClient}
            onSuccess={(message, result) => {
              success(message)
              setSelectedClient((current) => result.deleted ? null : current && { ...current, name: result.name })
            }}
          />
        )}
        onClose={() => setSelectedClient(null)}
      />

      {/* ── Toast Notifications Container ── */}


      {/* ── Client Enrollment & Bulk Roster Modal ── */}
      <ClientEnrollmentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        toastSuccess={success}
        toastError={error}
      />
    </div>
  )
}

export default function AdminClientsPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-8 text-center text-slate-400">
          Loading client directory...
        </div>
      }
    >
      <AdminClientsContent {...props} />
    </Suspense>
  )
}
