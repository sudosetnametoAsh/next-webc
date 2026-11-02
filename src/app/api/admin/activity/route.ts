import { createClient } from '@/lib/db/supabase-server'
import { NextResponse } from 'next/server'
import { shrinkCourseName } from '@/utils/formatters'

export type ActivityItem = {
  id: string
  type: 'sign' | 'task' | 'general'
  title: string
  subtitle?: string
  actorName: string
  deptName?: string
  iconName?: string
  tier?: number
  timestamp: string
}

export async function GET() {
  const supabase = await createClient()

  try {
    // 1. Fetch recent signed clearance records
    const { data: recentSignings, error: signError } = await supabase
      .from('clearance_records')
      .select(`
        clearance_id,
        user_id,
        status,
        signed_at,
        clearance_templates (
          tier,
          clearance_departments ( dept_name, icon_name ),
          courses ( course_name ),
          staffs ( staff_name )
        ),
        users (
          user_id,
          students ( student_name ),
          staffs ( staff_name )
        )
      `)
      .not('signed_at', 'is', null)
      .order('signed_at', { ascending: false })
      .limit(15)

    if (signError) {
      console.error('Error fetching recent signings:', signError)
    }

    // 2. Fetch recent general clearance logs (assigned tasks, batch sign-offs)
    const { data: recentLogs, error: logsError } = await supabase
      .from('clearance_logs')
      .select(`
        log_id,
        staff_id,
        actions,
        message,
        created_at,
        staffs ( staff_name )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (logsError) {
      console.error('Error fetching clearance logs:', logsError)
    }

    const activities: ActivityItem[] = []

    // Format signing records
    if (recentSignings && recentSignings.length > 0) {
      for (const record of recentSignings) {
        const template = record.clearance_templates as any
        const dept = template?.clearance_departments
        const user = record.users as any
        const student = Array.isArray(user?.students) ? user.students[0] : user?.students
        const staffUser = Array.isArray(user?.staffs) ? user.staffs[0] : user?.staffs
        const staff = template?.staffs
        const course = template?.courses

        const courseCode = course?.course_name
          ? shrinkCourseName(course.course_name) || course.course_name
          : 'Staff'

        const clientName = student?.student_name || staffUser?.staff_name || record.user_id
        const deptName = dept?.dept_name || 'Clearance Office'

        activities.push({
          id: `sign-${record.clearance_id}`,
          type: 'sign',
          title: `Clearance signed off for ${clientName}`,
          subtitle: `${deptName} · ${courseCode} (Phase ${template?.tier ?? 1})`,
          actorName: staff?.staff_name || deptName,
          deptName,
          iconName: dept?.icon_name || 'Building2',
          tier: template?.tier ?? 1,
          timestamp: record.signed_at || new Date().toISOString(),
        })
      }
    }

    // Format logs
    if (recentLogs && recentLogs.length > 0) {
      for (const log of recentLogs) {
        const staff = log.staffs as any
        const actionType = log.actions?.toLowerCase().includes('sign') ? 'sign' : 'task'

        activities.push({
          id: `log-${log.log_id}`,
          type: actionType,
          title: log.message,
          subtitle: log.actions,
          actorName: staff?.staff_name || 'Officer',
          timestamp: log.created_at,
        })
      }
    }

    // Sort combined feed by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      data: activities.slice(0, 15),
    })
  } catch (error) {
    console.error('Failed to fetch admin activity feed:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
