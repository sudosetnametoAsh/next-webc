import { createClient } from '@/lib/db/supabase-server'
import { clearanceWaitHours } from '@/lib/clearance-overdue'
import { NextRequest, NextResponse } from 'next/server'
import { shrinkCourseName, expandCourseAbbreviation } from '@/utils/formatters'
import { getCachedAdminRadar } from '@/lib/services/admin-cache'

export type FilterOption = {
  id: string
  label: string
  code?: string
  count: number
  type: 'all' | 'student' | 'staff'
}

export type DepartmentProgressItem = {
  deptId: number
  deptName: string
  iconName?: string
  floor: string | null
  room: string | null
  staffName?: string | null
  totalAssigned: number
  clearedCount: number
  pendingCount: number
  rate: number
  stalledCount: number
  avgWaitHours: number
  isBottleneck: boolean
}

export type PipelineRadarData = {
  activeFilter: string
  availableFilters: FilterOption[]
  totalClients: number
  isStaffOnly?: boolean
  staffSummary?: {
    totalAssigned: number
    clearedCount: number
    rate: number
    pendingCount: number
    stalledCount: number
    avgWaitHours: number
    isBottleneck: boolean
    departments: {
      deptId: number
      deptName: string
      iconName?: string
      rate: number
      clearedCount: number
      totalAssigned: number
      stalledCount: number
      avgWaitHours: number
      isBottleneck: boolean
    }[]
    bottleneckDept: {
      deptId: number
      deptName: string
      iconName?: string
      rate: number
      pendingCount: number
      stalledCount: number
      avgWaitHours: number
    } | null
  }
  phase1: {
    name: string
    totalAssigned: number
    clearedCount: number
    rate: number
    pendingCount: number
    stalledCount: number
    avgWaitHours: number
    isBottleneck: boolean
  }
  phase2: {
    name?: string
    totalAssigned: number
    clearedCount: number
    rate: number
    stalledCount: number
    avgWaitHours: number
    isBottleneck: boolean
    bottleneckDept: {
      deptId: number
      deptName: string
      iconName?: string
      rate: number
      pendingCount: number
      stalledCount: number
      avgWaitHours: number
    } | null
    departments: {
      deptId: number
      deptName: string
      iconName?: string
      rate: number
      clearedCount: number
      totalAssigned: number
      stalledCount: number
      avgWaitHours: number
      isBottleneck: boolean
    }[]
  }
  phase3: {
    name: string
    readyCount: number
    clearedCount: number
    totalAssigned: number
    rate: number
    stalledCount: number
    avgWaitHours: number
    isBottleneck: boolean
  }
  specificPhases?: {
    tier: number
    title: string
    totalAssigned: number
    clearedCount: number
    rate: number
    pendingCount: number
    stalledCount: number
    avgWaitHours: number
    isBottleneck: boolean
    bottleneckDept?: {
      deptId: number
      deptName: string
      iconName?: string
      rate: number
      pendingCount: number
      stalledCount: number
      avgWaitHours: number
    } | null
    departments: {
      deptId: number
      deptName: string
      iconName?: string
      rate: number
      clearedCount: number
      totalAssigned: number
      stalledCount: number
      avgWaitHours: number
      isBottleneck: boolean
    }[]
  }[]
  departmentProgress: DepartmentProgressItem[]
  health: {
    unassignedTemplatesCount: number
    uncoveredCoursesCount: number
    missingLocationsCount: number
    totalDepartments: number
    totalCourses: number
    totalTemplates: number
    uncoveredCourses: string[]
    missingLocationDepartments: string[]
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const requestedFilter = searchParams.get('filter') || 'all'

  try {
    const payload = await getCachedAdminRadar(requestedFilter, async () => {
      const supabase = await createClient()

      // 1. Fetch courses, departments, templates, and clearance records in parallel
      const [coursesRes, deptsRes, templatesRes, recordsRes] = await Promise.all([
      supabase.from('courses').select('course_id, course_name').order('course_name'),
      supabase.from('clearance_departments').select('dept_id, dept_name, icon_name, floor, room'),
      supabase
        .from('clearance_templates')
        .select(`
          template_id,
          course_id,
          dept_id,
          staff_id,
          tier,
          clearance_departments ( dept_id, dept_name, icon_name ),
          staffs ( staff_name )
        `)
        .eq('is_active', true),
      (async () => {
        const pageSize = 500
        const fetchPage = (offset: number) => supabase.from('current_clearance_records')
          .select('clearance_id, user_id, status, template_id, signed_at, created_at')
          .order('clearance_id').range(offset, offset + pageSize - 1)
        const first = await fetchPage(0)
        if (first.error) return first
        const data = [...first.data]
        let pageLength = first.data.length
        while (pageLength === pageSize) {
          const page = await fetchPage(data.length)
          if (page.error) return page
          data.push(...page.data)
          pageLength = page.data.length
        }
        return { ...first, data }
      })(),
    ])

    if (coursesRes.error) throw coursesRes.error
    if (deptsRes.error) throw deptsRes.error
    if (templatesRes.error) throw templatesRes.error
    if (recordsRes.error) throw recordsRes.error

    const courses = coursesRes.data || []
    const departments = deptsRes.data || []
    const templates = templatesRes.data || []
    const records = recordsRes.data || []

    const now = new Date()
    const nowTime = now.getTime()
    const HOLD_THRESHOLD_HOURS = 24
    const CAMPUS_VOLUME_THRESHOLD = 50

    function evaluateBottleneck(stalledCount: number, totalAssigned: number): boolean {
      if (totalAssigned >= CAMPUS_VOLUME_THRESHOLD) {
        return stalledCount >= CAMPUS_VOLUME_THRESHOLD
      }
      return totalAssigned > 0 && stalledCount >= Math.min(10, Math.ceil(totalAssigned * 0.4)) && stalledCount > 0
    }

    // ── 2. System Health Computations ──
    const templateCourseIds = new Set(templates.map((t) => t.course_id).filter(Boolean))
    const uncoveredCourses = courses
      .filter((c) => !templateCourseIds.has(c.course_id))
      .map((c) => c.course_name)

    const missingLocationDepartments = departments
      .filter((d) => !d.floor && !d.room)
      .map((d) => d.dept_name)

    const unassignedTemplatesCount = templates.filter(
      (t) => !t.staff_id || t.staff_id.trim() === ''
    ).length

    // ── 3. Template Metadata Lookup ──
    type TemplateMeta = {
      templateId: number
      courseId: number | null
      deptId: number
      tier: number
      deptName: string
      iconName: string
    }

    const templateMap = new Map<number, TemplateMeta>()

    templates.forEach((t: any) => {
      const dept = Array.isArray(t.clearance_departments)
        ? t.clearance_departments[0]
        : t.clearance_departments
      templateMap.set(t.template_id, {
        templateId: t.template_id,
        courseId: t.course_id,
        deptId: t.dept_id,
        tier: t.tier ?? 1,
        deptName: dept?.dept_name || 'Department',
        iconName: dept?.icon_name || 'Building2',
      })
    })

    // ── 4. Group records by user_id and associate courseId ──
    type UserRecord = {
      templateId: number
      courseId: number | null
      status: string
      tier: number
      deptId: number
      deptName: string
      iconName: string
      signedAt: string | null
      createdAt: string
    }

    type UserProfile = {
      userId: string
      courseId: number | null
      isStaff: boolean
      records: UserRecord[]
      tiers: number[]
      minTier: number
      maxTier: number
    }

    const userMap = new Map<string, UserRecord[]>()
    records.forEach((r) => {
      const meta = templateMap.get(r.template_id)
      if (!meta) return
      const list = userMap.get(r.user_id) || []
      list.push({
        templateId: r.template_id,
        courseId: meta.courseId,
        status: r.status,
        tier: meta.tier,
        deptId: meta.deptId,
        deptName: meta.deptName,
        iconName: meta.iconName,
        signedAt: r.signed_at ?? null,
        createdAt: r.created_at || new Date().toISOString(),
      })
      userMap.set(r.user_id, list)
    })

    const userProfiles: UserProfile[] = []
    const courseClientCounts = new Map<number, Set<string>>()
    const staffClientIds = new Set<string>()
    const allStudentIds = new Set<string>()

    for (const [userId, userRecords] of userMap) {
      const primaryCourseId = userRecords[0]?.courseId ?? null
      const isStaff = primaryCourseId === null
      const distinctTiers = Array.from(new Set(userRecords.map((r) => r.tier))).sort((a, b) => a - b)
      const minTier = distinctTiers[0] ?? 1
      const maxTier = distinctTiers[distinctTiers.length - 1] ?? 1

      userProfiles.push({
        userId,
        courseId: primaryCourseId,
        isStaff,
        records: userRecords,
        tiers: distinctTiers,
        minTier,
        maxTier,
      })

      if (isStaff) {
        staffClientIds.add(userId)
      } else {
        allStudentIds.add(userId)
        if (primaryCourseId) {
          const set = courseClientCounts.get(primaryCourseId) || new Set<string>()
          set.add(userId)
          courseClientCounts.set(primaryCourseId, set)
        }
      }
    }

    // ── 5. Build Available Filter Pills (Degree Programs & Staff Only) ──
    const availableFilters: FilterOption[] = []

    // Add Course Pills for courses that have configured templates
    courses.forEach((c) => {
      if (templateCourseIds.has(c.course_id)) {
        const shortCode = shrinkCourseName(c.course_name) || c.course_name
        const count = courseClientCounts.get(c.course_id)?.size || 0
        availableFilters.push({
          id: String(c.course_id),
          label: shortCode,
          code: c.course_name,
          count,
          type: 'student',
        })
      }
    })

    // Add Staff Pill if staff templates exist
    const staffTemplatesExist = templates.some((t) => t.course_id === null)
    if (staffTemplatesExist || staffClientIds.size > 0) {
      availableFilters.push({
        id: 'staff',
        label: 'Staff',
        count: staffClientIds.size,
        type: 'staff',
      })
    }

    // ── 6. Process Target Dataset based on activeFilter ──
    const defaultFilterId = availableFilters[0]?.id || 'staff'
    const activeFilter =
      requestedFilter && requestedFilter !== 'all' && availableFilters.some((f) => f.id === requestedFilter)
        ? requestedFilter
        : defaultFilterId

    const isStaffFilter = activeFilter === 'staff'
    const targetCourseId = !isStaffFilter ? Number(activeFilter) : null

    // Filtered users
    const filteredProfiles = userProfiles.filter((u) => {
      if (isStaffFilter) return u.isStaff
      if (targetCourseId !== null) return u.courseId === targetCourseId
      return !u.isStaff
    })

    const totalClients = filteredProfiles.length || 0

    // ── 6a. Helper to compute phase arrival & dwell time per student ──
    type UserPhaseTimeline = {
      userCreatedTime: number
      p1Records: UserRecord[]
      isP1Signed: boolean
      p1SignedTime: number | null
      p1DwellHours: number
      p1IsStalled: boolean

      p2Records: UserRecord[]
      hasP2Entered: boolean
      p2EntryTime: number | null
      isP2Signed: boolean
      p2SignedTime: number | null
      p2DwellHours: number
      p2IsStalled: boolean

      p3Records: UserRecord[]
      hasP3Entered: boolean
      p3EntryTime: number | null
      isP3Signed: boolean
      p3DwellHours: number
      p3IsStalled: boolean
    }

    function computeUserTimeline(u: UserProfile): UserPhaseTimeline {
      // Phase 1 (minTier)
      const p1Records = u.records.filter((r) => r.tier === u.minTier)
      const p1Timestamps = p1Records
        .map((r) => (r.createdAt ? new Date(r.createdAt).getTime() : 0))
        .filter((t) => t > 0)
      const userCreatedTime = p1Timestamps.length > 0
        ? Math.min(...p1Timestamps)
        : (u.records.length > 0 && u.records[0]?.createdAt ? new Date(u.records[0].createdAt).getTime() : nowTime)

      const isP1Signed = p1Records.length > 0 && p1Records.every((r) => r.status === 'Signed')
      const p1SignedTime = isP1Signed
        ? Math.max(
            ...p1Records.map((r) =>
              r.signedAt ? new Date(r.signedAt).getTime() : userCreatedTime
            )
          )
        : null
      const p1DwellHours = !isP1Signed
        ? Math.max(0, (nowTime - userCreatedTime) / 3600000)
        : 0
      const p1IsStalled = !isP1Signed && p1DwellHours >= HOLD_THRESHOLD_HOURS

      // Phase 2 (intermediate)
      const p2Records = u.records.filter((r) => r.tier > u.minTier && r.tier < u.maxTier)
      const hasP2Entered = isP1Signed && p2Records.length > 0
      const p2Timestamps = p2Records
        .map((r) => (r.createdAt ? new Date(r.createdAt).getTime() : 0))
        .filter((t) => t > 0)
      const p2EarliestCreated = p2Timestamps.length > 0 ? Math.min(...p2Timestamps) : null

      let p2EntryTime = hasP2Entered ? p1SignedTime || userCreatedTime : null
      if (hasP2Entered && p2EarliestCreated && p2EntryTime) {
        p2EntryTime = Math.max(p2EntryTime, p2EarliestCreated)
      }

      const isP2Signed =
        p2Records.length === 0 || p2Records.every((r) => r.status === 'Signed')
      const p2SignedTime =
        isP2Signed && p2Records.length > 0 && p2EntryTime
          ? Math.max(
              ...p2Records.map((r) =>
                r.signedAt ? new Date(r.signedAt).getTime() : p2EntryTime!
              )
            )
          : isP2Signed && p2Records.length === 0
          ? p1SignedTime
          : null
      const p2DwellHours =
        hasP2Entered && !isP2Signed && p2EntryTime
          ? Math.max(0, (nowTime - p2EntryTime) / 3600000)
          : 0
      const p2IsStalled =
        hasP2Entered && !isP2Signed && p2DwellHours >= HOLD_THRESHOLD_HOURS

      // Phase 3 (terminal)
      const p3Records = u.records.filter((r) => r.tier === u.maxTier && u.maxTier > u.minTier)
      const hasP3Entered = isP1Signed && isP2Signed && p3Records.length > 0
      const p3Timestamps = p3Records
        .map((r) => (r.createdAt ? new Date(r.createdAt).getTime() : 0))
        .filter((t) => t > 0)
      const p3EarliestCreated = p3Timestamps.length > 0 ? Math.min(...p3Timestamps) : null

      let p3EntryTime = hasP3Entered
        ? p2SignedTime || p1SignedTime || userCreatedTime
        : null
      if (hasP3Entered && p3EarliestCreated && p3EntryTime) {
        p3EntryTime = Math.max(p3EntryTime, p3EarliestCreated)
      }

      const isP3Signed =
        p3Records.length > 0 && p3Records.every((r) => r.status === 'Signed')
      const p3DwellHours =
        hasP3Entered && !isP3Signed && p3EntryTime
          ? Math.max(0, (nowTime - p3EntryTime) / 3600000)
          : 0
      const p3IsStalled =
        hasP3Entered && !isP3Signed && p3DwellHours >= HOLD_THRESHOLD_HOURS

      return {
        userCreatedTime,
        p1Records,
        isP1Signed,
        p1SignedTime,
        p1DwellHours,
        p1IsStalled,

        p2Records,
        hasP2Entered,
        p2EntryTime,
        isP2Signed,
        p2SignedTime,
        p2DwellHours,
        p2IsStalled,

        p3Records,
        hasP3Entered,
        p3EntryTime,
        isP3Signed,
        p3DwellHours,
        p3IsStalled,
      }
    }

    // ── 6b. Compute Department Clearance Progress & Temporal Queues ──
    const deptStatsMap = new Map<
      number,
      { assigned: number; cleared: number; eligiblePending: number; stalledCount: number; totalWaitHours: number }
    >()
    // Institutional department compliance evaluates all campus client profiles
    const targetProfilesForDepts = userProfiles

    targetProfilesForDepts.forEach((u) => {
      // Evaluate sequential phase eligibility based on user's assigned template tiers
      u.records.forEach((r) => {
        const current = deptStatsMap.get(r.deptId) || {
          assigned: 0,
          cleared: 0,
          eligiblePending: 0,
          stalledCount: 0,
          totalWaitHours: 0,
        }
        current.assigned++
        if (r.status === 'Signed') {
          current.cleared++
        } else {
          const timedRecords = u.records.map(record => ({
            status: record.status, tier: record.tier,
            created_at: record.createdAt, signed_at: record.signedAt,
          }))
          const hours = clearanceWaitHours({
            status: r.status, tier: r.tier,
            created_at: r.createdAt, signed_at: r.signedAt,
          }, timedRecords, u.isStaff, nowTime)
          const isEligible = hours !== null
          const dwellHours = hours ?? 0

          if (isEligible) {
            current.eligiblePending++
            current.totalWaitHours += dwellHours
            if (dwellHours >= HOLD_THRESHOLD_HOURS) {
              current.stalledCount++
            }
          }
        }
        deptStatsMap.set(r.deptId, current)
      })
    })

    const deptStaffMap = new Map<number, string>()
    templates.forEach((t: any) => {
      const staff = Array.isArray(t.staffs) ? t.staffs[0] : t.staffs
      if (staff?.staff_name && !deptStaffMap.has(t.dept_id)) {
        deptStaffMap.set(t.dept_id, staff.staff_name)
      }
    })

    const departmentProgress: DepartmentProgressItem[] = departments.map((d) => {
      const stats = deptStatsMap.get(d.dept_id) || {
        assigned: 0,
        cleared: 0,
        eligiblePending: 0,
        stalledCount: 0,
        totalWaitHours: 0,
      }
      const pendingCount = stats.assigned - stats.cleared
      const rate = stats.assigned > 0 ? Math.round((stats.cleared / stats.assigned) * 100) : 0
      const avgWaitHours = stats.eligiblePending > 0 ? Math.round(stats.totalWaitHours / stats.eligiblePending) : 0
      const isBottleneck = evaluateBottleneck(stats.stalledCount, stats.assigned)

      return {
        deptId: d.dept_id,
        deptName: d.dept_name,
        iconName: d.icon_name || 'Building2',
        floor: d.floor ?? null,
        room: d.room ?? null,
        staffName: deptStaffMap.get(d.dept_id) || null,
        totalAssigned: stats.assigned,
        clearedCount: stats.cleared,
        pendingCount,
        rate,
        stalledCount: stats.stalledCount,
        avgWaitHours,
        isBottleneck,
      }
    })

    // Sort active departments: most stalled clients first (primary bottlenecks top), then lowest rate
    departmentProgress.sort((a, b) => {
      if (a.totalAssigned > 0 && b.totalAssigned > 0) {
        if (b.stalledCount !== a.stalledCount) return b.stalledCount - a.stalledCount
        if (a.rate !== b.rate) return a.rate - b.rate
        return b.pendingCount - a.pendingCount
      }
      if (a.totalAssigned > 0) return -1
      if (b.totalAssigned > 0) return 1
      return a.deptName.localeCompare(b.deptName)
    })

    // Track departments that have reached bottleneck status campus-wide (>= 50 overdue clients across campus)
    const institutionalBottleneckDeptIds = new Set(
      departmentProgress.filter((d) => d.isBottleneck).map((d) => d.deptId)
    )

    // Helper to build dynamic tiered phase breakdown (used for both Courses and Staff)
    function buildSpecificPhases(
      targetTemplates: any[],
      profiles: UserProfile[]
    ): PipelineRadarData['specificPhases'] {
      const activeTiers = Array.from(new Set(targetTemplates.map((t) => t.tier ?? 1))).sort(
        (a, b) => a - b
      )

      if (activeTiers.length === 0) return undefined

      return activeTiers.map((tierNum) => {
        let tierTotalAssigned = 0
        let tierClearedCount = 0
        let tierStalledCount = 0
        let tierTotalWaitHours = 0

        const deptMap = new Map<
          number,
          {
            deptId: number
            deptName: string
            iconName: string
            assigned: number
            signed: number
            stalledCount: number
            totalWaitHours: number
          }
        >()

        profiles.forEach((u) => {
          const tierRecords = u.records.filter((r) => (r.tier ?? 1) === tierNum)
          const tierTimestamps = tierRecords
            .map((r) => (r.createdAt ? new Date(r.createdAt).getTime() : 0))
            .filter((t) => t > 0)
          const tierEarliestCreated = tierTimestamps.length > 0 ? Math.min(...tierTimestamps) : nowTime

          if (tierRecords.length > 0) {
            tierTotalAssigned++
            const isSigned = tierRecords.every((r) => r.status === 'Signed')
            if (isSigned) {
              tierClearedCount++
            } else {
              let isEligible = false
              let dwellHours = 0

              if (u.isStaff || tierNum === activeTiers[0] || tierNum <= u.minTier) {
                isEligible = true
                dwellHours = Math.max(0, (nowTime - tierEarliestCreated) / 3600000)
              } else {
                const lowerRecords = u.records.filter((r) => (r.tier ?? 1) < tierNum)
                const allLowerSigned =
                  lowerRecords.length > 0 && lowerRecords.every((r) => r.status === 'Signed')
                if (allLowerSigned) {
                  isEligible = true
                  const entryTime = Math.max(
                    ...lowerRecords.map((r) =>
                      r.signedAt ? new Date(r.signedAt).getTime() : tierEarliestCreated
                    )
                  )
                  dwellHours = Math.max(0, (nowTime - Math.max(entryTime, tierEarliestCreated)) / 3600000)
                }
              }

              if (isEligible) {
                tierTotalWaitHours += dwellHours
                if (dwellHours >= HOLD_THRESHOLD_HOURS) {
                  tierStalledCount++
                }
              }
            }

            tierRecords.forEach((r) => {
              const existing = deptMap.get(r.deptId) || {
                deptId: r.deptId,
                deptName: r.deptName,
                iconName: r.iconName,
                assigned: 0,
                signed: 0,
                stalledCount: 0,
                totalWaitHours: 0,
              }
              existing.assigned++
              if (r.status === 'Signed') {
                existing.signed++
              } else {
                let isEligible = false
                let dwellHours = 0
                const recCreated = r.createdAt ? new Date(r.createdAt).getTime() : nowTime

                if (u.isStaff || tierNum === activeTiers[0] || tierNum <= u.minTier) {
                  isEligible = true
                  dwellHours = Math.max(0, (nowTime - recCreated) / 3600000)
                } else {
                  const lowerRecords = u.records.filter((r) => (r.tier ?? 1) < tierNum)
                  const allLowerSigned =
                    lowerRecords.length > 0 && lowerRecords.every((r) => r.status === 'Signed')
                  if (allLowerSigned) {
                    isEligible = true
                    const entryTime = Math.max(
                      ...lowerRecords.map((r) =>
                        r.signedAt ? new Date(r.signedAt).getTime() : recCreated
                      )
                    )
                    dwellHours = Math.max(0, (nowTime - Math.max(entryTime, recCreated)) / 3600000)
                  }
                }

                if (isEligible) {
                  existing.totalWaitHours += dwellHours
                  if (dwellHours >= HOLD_THRESHOLD_HOURS) {
                    existing.stalledCount++
                  }
                }
              }
              deptMap.set(r.deptId, existing)
            })
          }
        })

        const deptList = Array.from(deptMap.values()).map((d) => {
          const rate = d.assigned > 0 ? Math.round((d.signed / d.assigned) * 100) : 0
          const pendingCount = d.assigned - d.signed
          const avgWaitHours = pendingCount > 0 ? Math.round(d.totalWaitHours / pendingCount) : 0
          const isBottleneck =
            (institutionalBottleneckDeptIds.has(d.deptId) && d.stalledCount > 0) ||
            evaluateBottleneck(d.stalledCount, d.assigned)
          return {
            deptId: d.deptId,
            deptName: d.deptName,
            iconName: d.iconName,
            rate,
            clearedCount: d.signed,
            totalAssigned: d.assigned,
            stalledCount: d.stalledCount,
            avgWaitHours,
            isBottleneck,
          }
        })

        deptList.sort((a, b) => {
          if (b.stalledCount !== a.stalledCount) return b.stalledCount - a.stalledCount
          return a.rate - b.rate
        })

        const rate =
          tierTotalAssigned > 0 ? Math.round((tierClearedCount / tierTotalAssigned) * 100) : 0
        const pendingCount = tierTotalAssigned - tierClearedCount
        const avgWaitHours =
          pendingCount > 0 ? Math.round(tierTotalWaitHours / pendingCount) : 0
        const hasBottleneckDept = deptList.some((d) => d.isBottleneck && d.stalledCount > 0)
        const isBottleneck =
          hasBottleneckDept || evaluateBottleneck(tierStalledCount, tierTotalAssigned)

        const title =
          activeTiers.length === 1
            ? `Phase ${tierNum}: Verification Offices`
            : tierNum === activeTiers[0]
            ? `Phase ${tierNum}: Prerequisite Settlement`
            : tierNum === activeTiers[activeTiers.length - 1]
            ? `Phase ${tierNum}: Final Endorsement`
            : `Phase ${tierNum}: Parallel Offices`

        const slowestDept = deptList.length > 0 ? deptList[0] : null
        const bottleneckDept =
          slowestDept && (slowestDept.isBottleneck || slowestDept.stalledCount > 0 || isBottleneck)
            ? {
                deptId: slowestDept.deptId,
                deptName: slowestDept.deptName,
                iconName: slowestDept.iconName,
                rate: slowestDept.rate,
                pendingCount: slowestDept.totalAssigned - slowestDept.clearedCount,
                stalledCount: slowestDept.stalledCount,
                avgWaitHours: slowestDept.avgWaitHours,
              }
            : null

        return {
          tier: tierNum,
          title,
          totalAssigned: tierTotalAssigned,
          clearedCount: tierClearedCount,
          rate,
          pendingCount,
          stalledCount: tierStalledCount,
          avgWaitHours,
          isBottleneck,
          bottleneckDept,
          departments: deptList,
        }
      })
    }

    // ── CASE A: STAFF ONLY VIEW ──
    if (isStaffFilter) {
      const staffDeptMap = new Map<
        number,
        {
          deptId: number
          deptName: string
          iconName: string
          assigned: number
          signed: number
          stalledCount: number
          totalWaitHours: number
        }
      >()

      let staffClearedCount = 0
      let staffStalledCount = 0
      let staffTotalWaitHours = 0

      filteredProfiles.forEach((u) => {
        const userCreatedTime = u.records[0]?.createdAt
          ? new Date(u.records[0].createdAt).getTime()
          : nowTime
        const isAllSigned = u.records.every((r) => r.status === 'Signed')
        if (isAllSigned && u.records.length > 0) {
          staffClearedCount++
        } else {
          const waitHours = Math.max(0, (nowTime - userCreatedTime) / 3600000)
          staffTotalWaitHours += waitHours
          if (waitHours >= HOLD_THRESHOLD_HOURS) {
            staffStalledCount++
          }
        }

        u.records.forEach((r) => {
          const existing = staffDeptMap.get(r.deptId) || {
            deptId: r.deptId,
            deptName: r.deptName,
            iconName: r.iconName,
            assigned: 0,
            signed: 0,
            stalledCount: 0,
            totalWaitHours: 0,
          }
          existing.assigned++
          if (r.status === 'Signed') {
            existing.signed++
          } else {
            const waitHours = Math.max(0, (nowTime - userCreatedTime) / 3600000)
            existing.totalWaitHours += waitHours
            if (waitHours >= HOLD_THRESHOLD_HOURS) {
              existing.stalledCount++
            }
          }
          staffDeptMap.set(r.deptId, existing)
        })
      })

      const staffDepartments = Array.from(staffDeptMap.values()).map((d) => {
        const rate = d.assigned > 0 ? Math.round((d.signed / d.assigned) * 100) : 0
        const pendingCount = d.assigned - d.signed
        const avgWaitHours = pendingCount > 0 ? Math.round(d.totalWaitHours / pendingCount) : 0
        const isBottleneck =
          (institutionalBottleneckDeptIds.has(d.deptId) && d.stalledCount > 0) ||
          evaluateBottleneck(d.stalledCount, d.assigned)
        return {
          deptId: d.deptId,
          deptName: d.deptName,
          iconName: d.iconName,
          rate,
          clearedCount: d.signed,
          totalAssigned: d.assigned,
          stalledCount: d.stalledCount,
          avgWaitHours,
          isBottleneck,
        }
      })

      staffDepartments.sort((a, b) => {
        if (b.stalledCount !== a.stalledCount) return b.stalledCount - a.stalledCount
        return a.rate - b.rate
      })

      const bottleneck =
        staffDepartments.length > 0
          ? {
              deptId: staffDepartments[0].deptId,
              deptName: staffDepartments[0].deptName,
              iconName: staffDepartments[0].iconName,
              rate: staffDepartments[0].rate,
              pendingCount: staffDepartments[0].totalAssigned - staffDepartments[0].clearedCount,
              stalledCount: staffDepartments[0].stalledCount,
              avgWaitHours: staffDepartments[0].avgWaitHours,
            }
          : null

      const staffRate = totalClients > 0 ? Math.round((staffClearedCount / totalClients) * 100) : 0
      const pendingStaffCount = totalClients - staffClearedCount
      const staffAvgWaitHours =
        pendingStaffCount > 0 ? Math.round(staffTotalWaitHours / pendingStaffCount) : 0
      const isStaffBottleneck =
        evaluateBottleneck(staffStalledCount, totalClients) ||
        staffDepartments.some((d) => d.isBottleneck && d.stalledCount > 0)

      // Dynamic tiered phase breakdown for staff
      const staffTemplates = templates.filter((t) => t.course_id === null)
      const specificPhases = buildSpecificPhases(staffTemplates, filteredProfiles)

      const payload: PipelineRadarData = {
        activeFilter,
        availableFilters,
        totalClients,
        isStaffOnly: true,
        specificPhases,
        staffSummary: {
          totalAssigned: totalClients,
          clearedCount: staffClearedCount,
          rate: staffRate,
          pendingCount: pendingStaffCount,
          stalledCount: staffStalledCount,
          avgWaitHours: staffAvgWaitHours,
          isBottleneck: isStaffBottleneck,
          departments: staffDepartments,
          bottleneckDept: bottleneck,
        },
        phase1: { name: 'Staff Verification', totalAssigned: 0, clearedCount: 0, rate: 0, pendingCount: 0, stalledCount: 0, avgWaitHours: 0, isBottleneck: false },
        phase2: { totalAssigned: 0, clearedCount: 0, rate: 0, stalledCount: 0, avgWaitHours: 0, isBottleneck: false, bottleneckDept: null, departments: [] },
        phase3: { name: 'Completed', readyCount: 0, clearedCount: 0, totalAssigned: 0, rate: 0, stalledCount: 0, avgWaitHours: 0, isBottleneck: false },
        departmentProgress,
        health: {
          unassignedTemplatesCount,
          uncoveredCoursesCount: uncoveredCourses.length,
          missingLocationsCount: missingLocationDepartments.length,
          totalDepartments: departments.length,
          totalCourses: courses.length,
          totalTemplates: templates.length,
          uncoveredCourses,
          missingLocationDepartments,
        },
      }

      return payload
    }

    // ── CASE B: SPECIFIC COURSE SELECTED ──
    let specificPhases: PipelineRadarData['specificPhases'] | undefined

    if (targetCourseId !== null) {
      const courseTemplates = templates.filter((t) => t.course_id === targetCourseId)
      specificPhases = buildSpecificPhases(courseTemplates, filteredProfiles)
    }

    // ── CASE C: DYNAMIC NORMALIZED LIFECYCLE (All Programs or Specific Course fallback) ──
    let p1Assigned = 0
    let p1Cleared = 0
    let p1StalledCount = 0
    let p1TotalWaitHours = 0

    let p2Assigned = 0
    let p2Cleared = 0
    let p2StalledCount = 0
    let p2TotalWaitHours = 0

    const p2DeptStats = new Map<
      number,
      {
        deptId: number
        deptName: string
        iconName: string
        assigned: number
        signed: number
        stalledCount: number
        totalWaitHours: number
      }
    >()

    let p3Assigned = 0
    let p3Cleared = 0
    let p3Ready = 0
    let p3StalledCount = 0
    let p3TotalWaitHours = 0

    filteredProfiles.forEach((u) => {
      const timeline = computeUserTimeline(u)
      const minTier = u.minTier
      const maxTier = u.maxTier

      const gateRecords = u.records.filter((r) => r.tier === minTier)
      const intermediateRecords = u.records.filter((r) => r.tier > minTier && r.tier < maxTier)
      const terminalRecords = u.records.filter((r) => r.tier === maxTier && maxTier > minTier)

      // Stage 1: Initial Gate (minTier)
      if (gateRecords.length > 0) {
        p1Assigned++
        if (timeline.isP1Signed) {
          p1Cleared++
        } else {
          p1TotalWaitHours += timeline.p1DwellHours
          if (timeline.p1IsStalled) p1StalledCount++
        }
      }

      // Stage 2: Intermediate Parallel Tiers
      if (intermediateRecords.length > 0) {
        p2Assigned++
        if (timeline.isP2Signed) {
          p2Cleared++
        } else if (timeline.hasP2Entered) {
          p2TotalWaitHours += timeline.p2DwellHours
          if (timeline.p2IsStalled) p2StalledCount++
        }

        intermediateRecords.forEach((r) => {
          const existing = p2DeptStats.get(r.deptId) || {
            deptId: r.deptId,
            deptName: r.deptName,
            iconName: r.iconName,
            assigned: 0,
            signed: 0,
            stalledCount: 0,
            totalWaitHours: 0,
          }
          existing.assigned++
          if (r.status === 'Signed') {
            existing.signed++
          } else {
            const lowerRecords = u.records.filter((other) => other.tier < r.tier)
            const allLowerSigned =
              lowerRecords.length === 0 || lowerRecords.every((other) => other.status === 'Signed')
            if (allLowerSigned) {
              const recCreated = r.createdAt ? new Date(r.createdAt).getTime() : nowTime
              const lowerSignedTimes = lowerRecords
                .map((other) => (other.signedAt ? new Date(other.signedAt).getTime() : 0))
                .filter((t) => t > 0)
              const tierEntryTime =
                lowerSignedTimes.length > 0 ? Math.max(...lowerSignedTimes) : recCreated
              const dwellHours = Math.max(
                0,
                (nowTime - Math.max(tierEntryTime, recCreated)) / 3600000
              )
              existing.totalWaitHours += dwellHours
              if (dwellHours >= HOLD_THRESHOLD_HOURS) {
                existing.stalledCount++
              }
            }
          }
          p2DeptStats.set(r.deptId, existing)
        })
      }

      // Stage 3: Terminal Endorsement (maxTier)
      if (terminalRecords.length > 0) {
        p3Assigned++
        if (timeline.isP3Signed) {
          p3Cleared++
        } else if (timeline.hasP3Entered) {
          p3Ready++
          p3TotalWaitHours += timeline.p3DwellHours
          if (timeline.p3IsStalled) p3StalledCount++
        }
      }
    })

    const phase2Departments = Array.from(p2DeptStats.values()).map((d) => {
      const rate = d.assigned > 0 ? Math.round((d.signed / d.assigned) * 100) : 0
      const pendingCount = d.assigned - d.signed
      const avgWaitHours = pendingCount > 0 ? Math.round(d.totalWaitHours / pendingCount) : 0
      const isBottleneck =
        (institutionalBottleneckDeptIds.has(d.deptId) && d.stalledCount > 0) ||
        evaluateBottleneck(d.stalledCount, d.assigned)
      return {
        deptId: d.deptId,
        deptName: d.deptName,
        iconName: d.iconName,
        rate,
        clearedCount: d.signed,
        totalAssigned: d.assigned,
        stalledCount: d.stalledCount,
        avgWaitHours,
        isBottleneck,
      }
    })

    // Sort Phase 2 departments: highest stalled count first, then lowest rate
    phase2Departments.sort((a, b) => {
      if (b.stalledCount !== a.stalledCount) return b.stalledCount - a.stalledCount
      if (a.rate !== b.rate) return a.rate - b.rate
      return (b.totalAssigned - b.clearedCount) - (a.totalAssigned - a.clearedCount)
    })

    const bottleneck =
      phase2Departments.length > 0
        ? {
            deptId: phase2Departments[0].deptId,
            deptName: phase2Departments[0].deptName,
            iconName: phase2Departments[0].iconName,
            rate: phase2Departments[0].rate,
            pendingCount:
              phase2Departments[0].totalAssigned - phase2Departments[0].clearedCount,
            stalledCount: phase2Departments[0].stalledCount,
            avgWaitHours: phase2Departments[0].avgWaitHours,
          }
        : null

    const p1Rate = p1Assigned > 0 ? Math.round((p1Cleared / p1Assigned) * 100) : 0
    const p1Pending = p1Assigned - p1Cleared
    const p1AvgWaitHours = p1Pending > 0 ? Math.round(p1TotalWaitHours / p1Pending) : 0
    const p1IsBottleneck = evaluateBottleneck(p1StalledCount, p1Assigned)

    const p2Rate = p2Assigned > 0 ? Math.round((p2Cleared / p2Assigned) * 100) : 0
    const p2Pending = p2Assigned - p2Cleared
    const p2AvgWaitHours = p2Pending > 0 ? Math.round(p2TotalWaitHours / p2Pending) : 0
    const p2IsBottleneck =
      evaluateBottleneck(p2StalledCount, p2Assigned) ||
      phase2Departments.some((d) => d.isBottleneck && d.stalledCount > 0)

    const p3Rate = p3Assigned > 0 ? Math.round((p3Cleared / p3Assigned) * 100) : 0
    const p3AvgWaitHours = p3Ready > 0 ? Math.round(p3TotalWaitHours / p3Ready) : 0
    const p3IsBottleneck = evaluateBottleneck(p3StalledCount, p3Assigned)

    const payload: PipelineRadarData = {
      activeFilter,
      availableFilters,
      totalClients,
      isStaffOnly: false,
      phase1: {
        name: 'Initial Prerequisite Gate',
        totalAssigned: p1Assigned,
        clearedCount: p1Cleared,
        rate: p1Rate,
        pendingCount: p1Pending,
        stalledCount: p1StalledCount,
        avgWaitHours: p1AvgWaitHours,
        isBottleneck: p1IsBottleneck,
      },
      phase2: {
        name: 'In-Flight Parallel Verification',
        totalAssigned: p2Assigned,
        clearedCount: p2Cleared,
        rate: p2Rate,
        stalledCount: p2StalledCount,
        avgWaitHours: p2AvgWaitHours,
        isBottleneck: p2IsBottleneck,
        bottleneckDept: bottleneck,
        departments: phase2Departments,
      },
      phase3: {
        name: 'Terminal Endorsement',
        readyCount: p3Ready,
        clearedCount: p3Cleared,
        totalAssigned: p3Assigned,
        rate: p3Rate,
        stalledCount: p3StalledCount,
        avgWaitHours: p3AvgWaitHours,
        isBottleneck: p3IsBottleneck,
      },
      specificPhases,
      departmentProgress,
      health: {
        unassignedTemplatesCount,
        uncoveredCoursesCount: uncoveredCourses.length,
        missingLocationsCount: missingLocationDepartments.length,
        totalDepartments: departments.length,
        totalCourses: courses.length,
        totalTemplates: templates.length,
        uncoveredCourses,
        missingLocationDepartments,
      },
    }

    return payload
  }, { fresh: searchParams.get('fresh') === 'true' })

  return NextResponse.json({ data: payload }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error: any) {
    console.error('Error fetching pipeline radar data:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
