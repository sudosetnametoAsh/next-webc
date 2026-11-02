import { NextRequest, NextResponse } from "next/server"
import { hardDeleteCourseTemplates } from "@/lib/services/template-deletion"

// DELETE: Hard-delete all specified course templates and all associated rows across all tables
export async function DELETE(req: NextRequest) {
  try {
    const { courseIds } = await req.json()

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json({ error: 'Course IDs are required' }, { status: 400 })
    }

    await hardDeleteCourseTemplates(courseIds.map(Number))

    return NextResponse.json(
      { success: true, message: 'All templates and associated records deleted successfully' },
      { status: 200 }
    )
  } catch (err) {
    console.error('Delete templates error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
