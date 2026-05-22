import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/supabase-server'
import { StaffAssignment } from '@/types/admin'

export async function GET() {

  const supabase = await createClient()

  try {
    // 1. Fetch staff templates (where course_id is NULL)
    const { data: templates, error: templatesError } = await supabase
      .from('clearance_templates')
      .select(`
        template_id,
        dept_id,
        clearance_departments ( dept_name ),
        staffs ( staff_name )
      `)
      .is('course_id', null)
  
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
      .from('staffs')
      .select('*', { count: 'exact', head: true })

    if (staffError) throw staffError

    // 3. Calculate completion rate for staff
    let completionRate = 0
    const templateIds = templates.map(t => t.template_id)

    if (templateIds.length > 0 && staffCount && staffCount > 0) {
      const { data: clearances, error: clearanceError } = await supabase
        .from('clearance_records')
        .select('user_id, status')
        .in('template_id', templateIds)

      if (clearanceError) throw clearanceError

      if (clearances && clearances.length > 0) {
        const staffStatusMap = new Map<string, string[]>()
        clearances.forEach((c: any) => {
          const list = staffStatusMap.get(c.user_id) || []
          list.push(c.status)
          staffStatusMap.set(c.user_id, list)
        })

        let fullyClearedCount = 0
        for (const [, statuses] of staffStatusMap) {
          if (statuses.length === templateIds.length && statuses.every(s => s === 'Signed')) {
            fullyClearedCount++
          }
        }
        completionRate = Math.round((fullyClearedCount / staffCount) * 100)
      }
    }

    // Format the response to match the structure expected by the UI (similar to CourseTemplateStats)
    const staffTemplate = {
      course_id: null, // Indicates this is for staff
      course_name: 'Staff Clearance',
      completion_rate: completionRate,
      students_enrolled: staffCount || 0, // Using same field name for consistency
      departments: templates.map((t: any) => ({
        dept_id: t.dept_id,
        dept_name: t.clearance_departments?.dept_name || 'Unknown',
        staff_name: t.staffs?.staff_name || null
      })),
      updated_at: new Date().toISOString()
    }

    return NextResponse.json({ data: [staffTemplate] }, { status: 200 })

  } catch (err: any) {
    console.error('Fetch staff templates error', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }

}

// POST: Create staff clearance templates
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

    // course_id is null for staff templates — that's what distinguishes them from student templates
    const templatesToInsert = assignments.map((a) => ({
      course_id: null,
      dept_id: a.dept_id,
      staff_id: a.staff_id,
    }))

    // const { data, error } = await supabase
    //   .from('clearance_templates')
    //   .upsert(templatesToInsert, {
    //     onConflict: 'dept_id, staff_id',
    //     ignoreDuplicates: false,
    //   })
    //   .select()

    const { data, error } = await supabase
      .from('clearance_templates')
      .insert(templatesToInsert)
      .select()

    if (error) {
      console.error('Error creating staff templates', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { data, message: `Successfully created ${data.length} staff clearance templates` },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create staff templates error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete all staff templates (course_id IS NULL)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()

  try {

    const { deptIds } = await req.json()

    if (!deptIds || deptIds.length === 0) {
      return NextResponse.json({ error: 'Course IDs are required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('clearance_templates')
      .delete()
      .in('dept_id', deptIds)
      .is('course_id', null)
    
    if (error) {
      return NextResponse.json({ error: 'Error deleting staff templates' }, { status: 500 })
    }

    // const { dept_id }: { dept_id?: number } = await req.json()

    // let query = supabase
    //   .from('clearance_templates')
    //   .delete()
    //   .is('course_id', null)

    // if (dept_id) {
    //   query = query.eq('dept_id', dept_id)
    // }

    // const { error } = await query

    // if (error) {
    //   console.error('Error deleting staff templates', error)
    //   return NextResponse.json({ error: error.message }, { status: 500 })
    // }

    return NextResponse.json({ message: 'Staff templates deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('Delete staff templates error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}