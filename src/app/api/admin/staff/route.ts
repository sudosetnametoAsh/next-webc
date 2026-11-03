import { createClient } from '@/lib/db/supabase-server'
import { NextResponse } from 'next/server'
import { computeClientOverdueStatus } from '@/lib/clearance-logic'


export async function GET() {
  const supabase = await createClient()

  try {
    const { data: staffs, error: staffError } = await supabase
      .from('staffs')
      .select('staff_id, staff_name')
      .order('staff_name', { ascending: true })

    if (staffError) {
      console.error('Error fetching staff:', staffError)
      return NextResponse.json({ error: staffError.message }, { status: 500 })
    }

    const staffIds = (staffs || []).map((s) => s.staff_id)
    if (staffIds.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }

    // Fetch clearance records for staff and staff template count in parallel
    const [clearancesResult, staffTemplatesResult] = await Promise.all([
      (async () => {
        const fetchPage = (offset: number) => supabase
        .from('clearance_records')
        .select(`
          clearance_id,
          user_id,
          status,
          signed_at,
          created_at,
          clearance_templates (
            dept_id,
            tier,
            staff_id,
            is_active,
            staffs (
              staff_name
            ),
            clearance_departments (
              dept_id,
              dept_name,
              icon_name,
              floor,
              room
            )
          )
        `)
        .in('user_id', staffIds)
          .order('clearance_id').range(offset, offset + 499)
        const first = await fetchPage(0)
        if (first.error) return first
        const data = [...first.data]
        let pageLength = first.data.length
        while (pageLength === 500) {
          const page = await fetchPage(data.length)
          if (page.error) return page
          data.push(...page.data)
          pageLength = page.data.length
        }
        return { ...first, data }
      })(),
      supabase
        .from('clearance_templates')
        .select('template_id')
        .is('course_id', null)
        .neq('is_active', false)
    ])

    if (clearancesResult.error) {
      console.error('Error fetching staff clearances:', clearancesResult.error)
      return NextResponse.json({ error: clearancesResult.error.message }, { status: 500 })
    }

    const staffTemplateDeptCount = staffTemplatesResult.data?.length || 0

    const clearanceMap = new Map<string, any[]>()
    for (const cr of clearancesResult.data || []) {
      const template = Array.isArray(cr.clearance_templates)
        ? cr.clearance_templates[0]
        : cr.clearance_templates
      if (template?.is_active === false) continue
      const list = clearanceMap.get(cr.user_id) || []
      list.push(cr)
      clearanceMap.set(cr.user_id, list)
    }

    const data = (staffs || []).map((staff) => {
      const records = clearanceMap.get(staff.staff_id) || []
      const totalDepts = records.length > 0 ? records.length : staffTemplateDeptCount
      const signedDepts = records.filter((r) => r.status === 'Signed').length

      const overallStatus =
        records.length === 0
          ? 'Incomplete'
          : records.every((r) => r.status === 'Signed')
          ? 'Signed'
          : records.every((r) => r.status === 'Pending')
          ? 'Pending'
          : 'Incomplete'

      const pendingDepts = records
        .filter((r) => r.status !== 'Signed' && r.clearance_templates?.clearance_departments)
        .map((r) => r.clearance_templates.clearance_departments)

      const departmentClearances = records.map((r: any) => ({
        clearance_id: r.clearance_id,
        dept_id: r.clearance_templates?.clearance_departments?.dept_id || r.clearance_templates?.dept_id,
        dept_name: r.clearance_templates?.clearance_departments?.dept_name || 'Department',
        icon_name: r.clearance_templates?.clearance_departments?.icon_name || null,
        floor: r.clearance_templates?.clearance_departments?.floor || null,
        room: r.clearance_templates?.clearance_departments?.room || null,
        staff_name: r.clearance_templates?.staffs?.staff_name || null,
        tier: r.clearance_templates?.tier ?? 1,
        status: r.status as 'Incomplete' | 'Pending' | 'Signed',
        signed_at: r.signed_at,
        created_at: r.created_at,
      }))

      const overdueInfo = computeClientOverdueStatus(departmentClearances, true)

      return {
        staff_id: staff.staff_id,
        staff_name: staff.staff_name,
        overallStatus,
        total_departments: totalDepts,
        signed_departments: signedDepts,
        pending_departments: pendingDepts,
        departments: departmentClearances,
        isOverdue: overdueInfo.isOverdue,
        overduePhase: overdueInfo.overduePhase,
        overduePhaseLabel: overdueInfo.overduePhaseLabel,
        dwellHours: overdueInfo.dwellHours,
      }
    })

    return NextResponse.json({ data }, { status: 200 })
  } catch (error: any) {
    console.error('Error in staff route:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
