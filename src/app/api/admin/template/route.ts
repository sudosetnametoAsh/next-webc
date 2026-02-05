import { createClient } from '@/lib/supabase-config'
import { NextResponse } from 'next/server'

const supabase = createClient()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { courseIds, staffAssignments } = body

    // Validation
    if (!courseIds || courseIds.length === 0 || !staffAssignments || staffAssignments.length === 0) {
      return NextResponse.json({ error: 'Missing courses or assignments' }, { status: 400 })
    }

    // Prepare the rows to insert
    // We need to create a row for every combination of Course + Department
    const rowsToInsert: any[] = []

    courseIds.forEach((courseId: number) => {
      staffAssignments.forEach((assignment: any) => {
        rowsToInsert.push({
          course_id: courseId,
          dept_id: assignment.dept_id,      
          staff_id: assignment.staff_id,
          // Add any other default fields if your schema requires them
        })
      })
    })

    // Perform the Insert
    const { error } = await supabase
      .from('clearance_templates')
      .insert(rowsToInsert)

    if (error) {
      console.error('Supabase Insert Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}