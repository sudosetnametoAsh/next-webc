import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/supabase-server'
import { StaffAssignment } from '@/types/admin'

export async function GET() {

  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('clearance_templates')
      .select('dept_id')
      .is('course_id', null)
  
    if (error) {
      console.error('Error fetching staff templates', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 200 })

  } catch (err) {
    console.error('Create staff templates error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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