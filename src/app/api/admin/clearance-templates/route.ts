import { createClient } from "@/lib/supabase-config"
import { NextRequest, NextResponse } from "next/server"


// DELETE: Remove all templates
export async function DELETE(req: NextRequest) {

  const supabase = createClient()

  try {
    const { courseIds } = await req.json()

    if (!courseIds || courseIds.length === 0) {
      return NextResponse.json({ error: 'Course IDs are required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('clearance_templates')
      .delete()
      .in('course_id', courseIds)
    
    if (error) {
      return NextResponse.json({ error: 'Error deleting templates' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (err) {
    console.error('Delete templates error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}