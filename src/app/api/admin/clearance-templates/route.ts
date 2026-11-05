import { NextRequest, NextResponse } from "next/server"
import { archiveCourseTemplates } from "@/lib/services/template-deletion"

// DELETE: Archive all specified course templates while preserving clearance history
export async function DELETE(req: NextRequest) {
  try {
    const { courseIds } = await req.json()

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json({ error: 'Course IDs are required' }, { status: 400 })
    }

    await archiveCourseTemplates(courseIds.map(Number))

    return NextResponse.json(
      { success: true, message: 'All templates archived successfully; clearance history preserved' },
      { status: 200 }
    )
  } catch (err) {
    console.error('Delete templates error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
