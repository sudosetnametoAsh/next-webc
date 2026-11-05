import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { createClient } from '@/lib/db/supabase-server'
import { db } from '@/lib/db'
import { getSupabaseAdmin } from '@/lib/db/supabase-admin'
import { students, staffs, users, notifications, clearanceTasks, clearanceRecords, clearanceTemplates, courses, clearanceDepartments } from '@/lib/db/schema'
import { invalidateServerAdminCache } from '@/lib/services/admin-cache'
import { invalidateServerDepartmentCache } from '@/lib/services/department-cache'
import { invalidateServerClearanceCache } from '@/lib/services/clearance-cache'

const identity = z.object({ id: z.string().trim().min(1), type: z.enum(['student', 'staff']) })
const update = identity.extend({ name: z.string().trim().min(1).max(255) })

async function mutate(req: NextRequest, deleting: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const roles = user.user_metadata?.custom_claims?.roles
  if (!Array.isArray(roles) || !roles.includes('Admin')) {
    return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON request' }, { status: 400 })
  }
  const parsed = (deleting ? identity : update).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'A valid client ID, type, and name are required' }, { status: 400 })
  const { id, type } = parsed.data
  try {
    const result = await db.transaction(async (tx) => {
      // Lock the identity before its profile so enrollment and deletion cannot interleave.
      const [account] = deleting ? await tx.select().from(users).where(eq(users.userId, id)).for('update') : []
      const table = type === 'student' ? students : staffs
      const key = type === 'student' ? students.studentId : staffs.staffId
      const existing = await tx.select().from(table).where(eq(key, id)).for('update')
      if (!existing.length) return { error: 'Client not found', status: 404 }
      if (deleting) {
        const otherProfile = type === 'student'
          ? await tx.select({ id: staffs.staffId }).from(staffs).where(eq(staffs.staffId, id)).limit(1)
          : await tx.select({ id: students.studentId }).from(students).where(eq(students.studentId, id)).limit(1)
        if (otherProfile.length) return { error: 'This identity has both student and staff profiles. Resolve the shared profiles before deleting their clearance records.', status: 409 }
        if (account && (account.authId === user.id || account.email.toLowerCase() === user.email?.toLowerCase())) {
          return { error: 'You cannot delete your own account from the client list.', status: 409 }
        }
        if (account?.authId) {
          const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(account.authId)
          if (error && error.code !== 'user_not_found') throw error
          const targetRoles = data?.user?.user_metadata?.custom_claims?.roles
          if (Array.isArray(targetRoles) && targetRoles.includes('Admin')) {
            return { error: 'Administrator accounts cannot be deleted from the client list.', status: 409 }
          }
        }
        {
          const assigned = await tx.select({
            templateId: clearanceTemplates.templateId,
            courseId: clearanceTemplates.courseId,
            courseName: courses.courseName,
            departmentId: clearanceTemplates.deptId,
            departmentName: clearanceDepartments.deptName,
            tier: clearanceTemplates.tier,
            isActive: clearanceTemplates.isActive,
          }).from(clearanceTemplates)
            .leftJoin(courses, eq(courses.courseId, clearanceTemplates.courseId))
            .leftJoin(clearanceDepartments, eq(clearanceDepartments.deptId, clearanceTemplates.deptId))
            .where(eq(clearanceTemplates.staffId, id))
            .orderBy(courses.courseName, clearanceDepartments.deptName, clearanceTemplates.templateId)
          if (assigned.length) {
            const templates = assigned.map((template) => {
              const course = template.courseId === null ? 'Staff clearance' : template.courseName || `Course #${template.courseId}`
              const department = template.departmentName || `Department #${template.departmentId}`
              const details = [template.courseId !== null ? `Phase ${template.tier}` : null, template.isActive === false ? 'inactive' : null].filter(Boolean)
              return `• ${course} — ${department}${details.length ? ` (${details.join(', ')})` : ''}`
            })
            return { error: `Reassign this staff member’s clearance templates before deleting them:\n${templates.join('\n')}`, status: 409 }
          }
        }
        const assignedTasks = await tx.select({ id: clearanceTasks.assignedTaskId }).from(clearanceTasks).where(eq(clearanceTasks.staffId, id)).limit(1)
        if (assignedTasks.length) return { error: 'This client owns assigned tasks. Reassign their department responsibilities before deleting them.', status: 409 }
        // Remove personal notification ownership and the application identity atomically.
        // The separate Supabase Auth account is retained for future re-enrollment.
        await tx.delete(notifications).where(eq(notifications.userId, id))
        await tx.delete(clearanceRecords).where(eq(clearanceRecords.userId, id))
        await tx.delete(table).where(eq(key, id))
        await tx.delete(users).where(eq(users.userId, id))
      } else {
        const { name } = update.parse(body)
        if (type === 'student') await tx.update(students).set({ studentName: name }).where(eq(students.studentId, id))
        else await tx.update(staffs).set({ staffName: name }).where(eq(staffs.staffId, id))
      }
      return null
    })
    if (result) return NextResponse.json({ error: result.error }, { status: result.status })
    invalidateServerAdminCache()
    invalidateServerDepartmentCache()
    invalidateServerClearanceCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Client mutation failed:', error)
    return NextResponse.json({ error: 'Unable to save client changes. Please try again.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) { return mutate(req, false) }
export async function DELETE(req: NextRequest) { return mutate(req, true) }
