import { createClient } from '@/lib/db/supabase-server'
import { getSupabaseAdmin } from '@/lib/db/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { invalidateServerAdminCache } from '@/lib/services/admin-cache'
import { invalidateServerDepartmentCache } from '@/lib/services/department-cache'
import { invalidateServerClearanceCache } from '@/lib/services/clearance-cache'
import { syncStudentCompletionNotification } from '@/lib/services/student-completion'
import { hardDeleteCourseTemplates, hardDeleteTemplatesByIds, removeTasksOnStaffReassignment } from '@/lib/services/template-deletion'


// --- GET: Fetch Course Templates & Stats ---
export async function GET() {

  const supabase = await createClient()

  try {
    // 1. Get all courses
    const { data, error: coursesError } = await supabase
      .from('courses')
      .select(`
        course_id, 
        course_name,
        clearance_templates (
          template_id,
          dept_id,
          staff_id,
          tier,
          is_active,
          clearance_departments ( dept_name, icon_name ),
          staffs ( staff_name )
        )
      `)
      .order('course_name')
    
    if (coursesError) throw coursesError

    // Filter courses that have at least one active template
    const courses = (data || []).filter(d => 
      (d.clearance_templates || []).some((t: any) => t.is_active !== false)
    )

    // 2. Calculate stats
    const courseTemplates = await Promise.all(
      courses.map(async (course: any) => {
        const activeTemplates = (course.clearance_templates || []).filter(
          (t: any) => t.is_active !== false
        )

        // A. Get Sections
        const { data: sections, error: sectionsError } = await supabase
           .from('course_sections')
           .select('section_id')
           .eq('course_id', course.course_id)
        
        if (sectionsError) throw sectionsError
        const sectionIds = sections?.map(s => s.section_id) || []

        // B. Get Enrollment Count
        let studentsEnrolled = 0
        if (sectionIds.length > 0) {
            const { count, error: enrollmentError } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .in('section_id', sectionIds)
            if (enrollmentError) throw enrollmentError
            studentsEnrolled = count || 0
        }

        // C. Completion Rate Logic (Aggregate Department Sign-off Progress for active templates)
        const templateIds = activeTemplates.map((t: any) => t.template_id)
        let completionRate = 0

        if (templateIds.length > 0 && studentsEnrolled > 0) {
          const { count: signedCount, error: clearanceError } = await supabase
            .from('clearance_records')
            .select('clearance_id', { count: 'exact', head: true })
            .in('template_id', templateIds)
            .eq('status', 'Signed')
          if (clearanceError) throw clearanceError
          
          if (signedCount != null) {
            const totalPossibleSignatures = studentsEnrolled * templateIds.length
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

        return {
          course_id: course.course_id,
          course_name: course.course_name,
          completion_rate: completionRate,
          students_enrolled: studentsEnrolled,
          departments: activeTemplates.map((t: any) => ({
            dept_id: t.dept_id,
            dept_name: t.clearance_departments?.dept_name || 'Unknown',
            icon_name: t.clearance_departments?.icon_name || 'Building2',
            staff_id: t.staff_id,
            staff_name: t.staffs?.staff_name || null,
            tier: t.tier ?? 1
          })).sort((a: any, b: any) => (a.tier ?? 1) - (b.tier ?? 1) || a.dept_name.localeCompare(b.dept_name)),
          updated_at: new Date().toISOString()
        }
      })
    )

    return NextResponse.json({ data: courseTemplates }, { status: 200, headers: { 'Cache-Control': 'private, no-store' } })

  } catch (error: any) {
    console.error('GET Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Create templates
export async function POST(req: NextRequest) {

  const supabase = await createClient()

  try {
    const { courses, assignments } = await req.json()

    if (!Array.isArray(courses) || courses.length === 0) {
      return NextResponse.json({ error: 'At least one course is required' }, { status: 400 })
    }

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ error: 'At least one department is required' }, { status: 400 })
    }

    // Validate all assignments have staff
    const missingStaff = assignments.filter(a => !a.staff_id)
    if (missingStaff.length > 0) {
      return NextResponse.json({ error: 'All departments must have assigned staff' }, { status: 400 })
    }

    if (new Set(assignments.map((a: { staff_id: string | null }) => a.staff_id)).size !== assignments.length) {
      return NextResponse.json({ error: 'Each staff officer can only be assigned to one department per template' }, { status: 400 })
    }

    // 1. Fetch existing templates for these courses to check for staff reassignments
    const { data: existingTemplates } = await supabase
      .from('clearance_templates')
      .select('template_id, course_id, dept_id, staff_id, tier, is_active')
      .in('course_id', courses)

    // 2. Remove clearance tasks given by previous staff if any department officer was reassigned
    if (existingTemplates && existingTemplates.length > 0) {
      for (const courseId of courses) {
        for (const a of assignments) {
          const existing = existingTemplates.find(
            (t: any) => t.course_id === courseId && t.dept_id === a.dept_id
          )
          if (existing && existing.staff_id !== a.staff_id) {
            await removeTasksOnStaffReassignment(existing.template_id, existing.staff_id)
          }
        }
      }
    }

    // 3. Hard-delete departments that were unassigned for these courses and their associated records/tasks
    const assignedDeptIds = assignments.map((a) => a.dept_id)
    if (assignedDeptIds.length > 0) {
      const { data: unassignedTemplates } = await supabase
        .from('clearance_templates')
        .select('template_id')
        .in('course_id', courses)
        .not('dept_id', 'in', `(${assignedDeptIds.join(',')})`)

      const unassignedIds = (unassignedTemplates || []).map((t: any) => t.template_id)
      if (unassignedIds.length > 0) {
        await hardDeleteTemplatesByIds(unassignedIds)
      }
    }

    // 4. Create / update active templates for each course
    const templatesToInsert = courses.flatMap((courseId) => (
      assignments.map((a) => ({
        course_id: courseId,
        dept_id: a.dept_id,
        staff_id: a.staff_id,
        tier: a.tier ?? 1,
        is_active: true,
      }))
    ))

    const { data, error } = await supabase
      .from('clearance_templates')
      .upsert(templatesToInsert, {
        onConflict: 'course_id, dept_id',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('Error creating templates', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Broadcast scoped notifications to assigned Department Staff and enrolled Students
    try {
      const adminClient = getSupabaseAdmin();

      // Fetch course names for descriptive notification
      const { data: courseRows } = await adminClient
        .from('courses')
        .select('course_id, course_name')
        .in('course_id', courses);
      const courseNames = (courseRows || []).map((c: any) => c.course_name).filter(Boolean);
      const courseText = courseNames.length > 0 ? courseNames.join(', ') : `${courses.length} course(s)`;

      const notifsToInsert: any[] = [];

      // Group assignments by assigned staff_id so each officer receives exactly one scoped notification
      const staffAssignmentMap = new Map<string, number[]>();
      for (const a of assignments) {
        if (a.staff_id) {
          if (!staffAssignmentMap.has(a.staff_id)) {
            staffAssignmentMap.set(a.staff_id, []);
          }
          staffAssignmentMap.get(a.staff_id)!.push(a.dept_id);
        }
      }

      for (const [staffId, deptIds] of staffAssignmentMap.entries()) {
        notifsToInsert.push({
          user_id: staffId,
          department_id: deptIds[0],
          target_role: 'department',
          category: 'template',
          title: 'New Clearance Templates Assigned',
          description: `You have been assigned to manage clearance templates for ${courseText}.`,
          type: 'Info',
          ref_url: '/department/clients',
          is_read: false,
          metadata: { courseIds: courses, deptIds },
        });
      }

      // Unassigned departments broadcast (if any assignment had no staff_id)
      const unassignedDepts = assignments.filter((a) => !a.staff_id).map((a) => a.dept_id);
      for (const dId of Array.from(new Set(unassignedDepts))) {
        notifsToInsert.push({
          user_id: null,
          department_id: dId,
          target_role: 'department',
          category: 'template',
          title: 'New Clearance Templates Assigned',
          description: `Admin assigned clearance templates for ${courseText}.`,
          type: 'Info',
          ref_url: '/department/clients',
          is_read: false,
          metadata: { courseIds: courses, deptId: dId },
        });
      }

      // Scoped student notifications per course
      for (const cId of courses) {
        notifsToInsert.push({
          course_id: cId,
          user_id: null,
          target_role: 'student',
          category: 'template',
          title: 'Clearance Templates Published',
          description: 'New clearance templates and requirements have been configured for your academic program.',
          type: 'Info',
          ref_url: '/clearance',
          is_read: false,
          metadata: { courseId: cId },
        });
      }

      if (notifsToInsert.length > 0) {
        await adminClient.from('notifications').insert(notifsToInsert);
      }
    } catch (notifErr) {
      console.error('Failed to insert template assignment notifications:', notifErr);
    }

    invalidateServerAdminCache()
    invalidateServerDepartmentCache()
    invalidateServerClearanceCache()

    return NextResponse.json({ data, message: `Successfully created ${data.length} clearance templates` }, { status: 201 })

  } catch (error) {
    console.error('Create templates error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Hard-delete course templates and all associated rows across all tables
export async function DELETE(req: NextRequest) {
  try {
    const { course_id } = await req.json()

    if (!course_id) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    await hardDeleteCourseTemplates([Number(course_id)])

    return NextResponse.json(
      { success: true, message: 'Course template and all associated rows deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete template error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
