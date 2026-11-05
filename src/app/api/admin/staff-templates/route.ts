import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/supabase-server'
import { getSupabaseAdmin } from '@/lib/db/supabase-admin'
import { StaffAssignment } from '@/types/admin'
import { invalidateServerAdminCache } from '@/lib/services/admin-cache'
import { invalidateServerDepartmentCache } from '@/lib/services/department-cache'
import { archiveStaffTemplates, archiveTemplatesByIds, removeTasksOnStaffReassignment } from '@/lib/services/template-deletion'

// GET: Fetch staff templates (where course_id is NULL)
export async function GET() {

  const supabase = await createClient()

  try {
    // 1. Fetch active staff templates (where course_id is NULL)
    const { data: templates, error: templatesError } = await supabase
      .from('clearance_templates')
      .select(`
        template_id,
        dept_id,
        staff_id,
        tier,
        is_active,
        clearance_departments ( dept_name, icon_name ),
        staffs ( staff_name )
      `)
      .is('course_id', null)
      .neq('is_active', false)
  
    if (templatesError) {
      console.error('Error fetching staff templates', templatesError)
      return NextResponse.json({ error: templatesError.message }, { status: 500 })
    }

    if (!templates || templates.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }

    // 2. Fetch all staff to calculate enrollment count
    // (Assuming we want to know how many staff members exist)
    const { count: staffCount, error: staffError } = await supabase
      .from('current_staffs')
      .select('*', { count: 'exact', head: true })

    if (staffError) throw staffError

    // 3. Calculate completion rate for staff
    let completionRate = 0
    const templateIds = templates.map(t => t.template_id)

    if (templateIds.length > 0 && staffCount && staffCount > 0) {
      const { count: signedCount, error: clearanceError } = await supabase
        .from('current_clearance_records')
        .select('clearance_id', { count: 'exact', head: true })
        .in('template_id', templateIds)
        .eq('status', 'Signed')

      if (clearanceError) throw clearanceError

      if (signedCount != null) {
        const totalPossibleSignatures = staffCount * templateIds.length
        const signedSignatures = signedCount
        
        completionRate = totalPossibleSignatures > 0
          ? Math.round((signedSignatures / totalPossibleSignatures) * 100)
          : 0

        // Ensure >= 1% if at least one department has signed
        if (signedSignatures > 0 && completionRate === 0) {
          completionRate = 1
        }
        // Ensure < 100% if not all signatures are completed
        if (signedSignatures < totalPossibleSignatures && completionRate === 100) {
          completionRate = 99
        }
      }
    }

    // Format the response to match the structure expected by the UI (similar to CourseTemplateStats)
    const staffTemplate = {
      course_id: null, // Indicates this is for staff
      course_name: 'Staff Clearance',
      completion_rate: completionRate,
      students_enrolled: staffCount || 0, // Using same field name for consistency
      departments: templates
        .map((t: any) => ({
          dept_id: t.dept_id,
          dept_name: t.clearance_departments?.dept_name || 'Unknown',
          icon_name: t.clearance_departments?.icon_name || 'Building2',
          staff_id: t.staff_id,
          staff_name: t.staffs?.staff_name || null,
          tier: t.tier ?? 1,
        }))
        .sort(
          (a: any, b: any) =>
            (a.tier ?? 1) - (b.tier ?? 1) || a.dept_name.localeCompare(b.dept_name)
        ),
      updated_at: new Date().toISOString()
    }

    return NextResponse.json({ data: [staffTemplate] }, { status: 200, headers: { 'Cache-Control': 'private, no-store' } })

  } catch (err: any) {
    console.error('Fetch staff templates error', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }

}

// POST: Create / Update staff clearance templates safely without cascading deletes
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  try {
    const { assignments }: { assignments: StaffAssignment[] } = await req.json()

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ error: 'At least one department is required' }, { status: 400 })
    }

    const missingStaff = assignments.filter((a) => !a.staff_id)
    if (missingStaff.length > 0) {
      return NextResponse.json({ error: 'All departments must have assigned staff' }, { status: 400 })
    }

    if (new Set(assignments.map((a: { staff_id: string | null }) => a.staff_id)).size !== assignments.length) {
      return NextResponse.json({ error: 'Each staff officer can only be assigned to one department per template' }, { status: 400 })
    }

    // 1. Fetch existing staff templates (where course_id is NULL)
    const { data: existingTemplates, error: fetchErr } = await supabase
      .from('clearance_templates')
      .select('template_id, dept_id, staff_id, tier, is_active')
      .is('course_id', null)

    if (fetchErr) throw fetchErr

    const existingMap = new Map<number, any>()
    for (const t of existingTemplates || []) {
      existingMap.set(t.dept_id, t)
    }

    const assignedDeptIds = new Set(assignments.map((a) => a.dept_id))
    const savedTemplates: any[] = []

    // 2. Upsert each assignment safely
    for (const a of assignments) {
      const existing = existingMap.get(a.dept_id)

      if (existing) {
        // Staff reassignment: remove all clearance tasks given by previous staff
        if (existing.staff_id !== a.staff_id) {
          await removeTasksOnStaffReassignment(existing.template_id, existing.staff_id)
        }

        // Update existing template row in-place (preserves template_id & clearance_records)
        const { data: updated, error: updateErr } = await supabase
          .from('clearance_templates')
          .update({
            staff_id: a.staff_id,
            tier: a.tier ?? 1,
            is_active: true,
          })
          .eq('template_id', existing.template_id)
          .select()
          .single()

        if (updateErr) throw updateErr
        if (updated) savedTemplates.push(updated)
      } else {
        // Insert new staff template
        const { data: inserted, error: insertErr } = await supabase
          .from('clearance_templates')
          .insert({
            course_id: null,
            dept_id: a.dept_id,
            staff_id: a.staff_id,
            tier: a.tier ?? 1,
            is_active: true,
          })
          .select()
          .single()

        if (insertErr) throw insertErr
        if (inserted) savedTemplates.push(inserted)
      }
    }

    // 3. Archive unselected staff departments while preserving history
    const unassignedTemplateIds = (existingTemplates || [])
      .filter((t: any) => !assignedDeptIds.has(t.dept_id))
      .map((t: any) => t.template_id)

    if (unassignedTemplateIds.length > 0) {
      await archiveTemplatesByIds(unassignedTemplateIds)
    }

    // 4. Notify assigned staff officers
    try {
      const adminClient = getSupabaseAdmin();
      const staffNotifs = assignments
        .filter((a) => {
          const previous = existingMap.get(a.dept_id)
          return a.staff_id && (!previous || previous.is_active === false || previous.staff_id !== a.staff_id)
        })
        .map((a) => ({
          user_id: a.staff_id,
          department_id: a.dept_id,
          target_role: "department",
          category: "template",
          title: "Staff Clearance Template Assigned",
          description: "You have been assigned to manage staff clearance for your department.",
          type: "Info",
          ref_url: "/department/clients?type=staff",
          is_read: false,
          metadata: { deptId: a.dept_id, type: "staff" },
        }));

      if (staffNotifs.length > 0) {
        await adminClient.from("notifications").insert(staffNotifs);
      }
    } catch (notifErr) {
      console.error("Failed to notify staff of template assignment:", notifErr);
    }

    invalidateServerAdminCache()
    invalidateServerDepartmentCache()

    return NextResponse.json(
      { data: savedTemplates, message: `Successfully saved ${savedTemplates.length} staff clearance templates` },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Save staff templates error', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Archive staff clearance templates while preserving clearance history
export async function DELETE(req: NextRequest) {
  try {
    const { deptIds } = await req.json()

    if (!deptIds || !Array.isArray(deptIds) || deptIds.length === 0) {
      return NextResponse.json({ error: 'Department IDs are required' }, { status: 400 })
    }

    await archiveStaffTemplates(deptIds.map(Number))

    return NextResponse.json(
      { success: true, message: 'Staff templates archived successfully; clearance history preserved' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete staff templates error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
