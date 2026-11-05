import { createClient } from "@/lib/db/supabase-server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  try {
    const searchParams = req.nextUrl.searchParams
    const courseId = searchParams.get("courseId")
    const type = searchParams.get("type") || (courseId ? "student" : "staff")

    let templateIds: number[] = []

    if (type === "staff") {
      const { data: templates } = await supabase
        .from("clearance_templates")
        .select("template_id")
        .is("course_id", null)
      templateIds = (templates || []).map((t: any) => t.template_id)
    } else if (courseId) {
      const { data: templates } = await supabase
        .from("clearance_templates")
        .select("template_id")
        .eq("course_id", parseInt(courseId))
      templateIds = (templates || []).map((t: any) => t.template_id)
    }

    if (templateIds.length === 0) {
      return NextResponse.json({
        enrolledCount: 0,
        signedCount: 0,
        pendingCount: 0,
        tasksCount: 0,
        hasActiveClearances: false,
      })
    }

    // 1. Fetch clearance_records status counts
    const { data: records, error: recordsErr } = await supabase
      .from("current_clearance_records")
      .select("clearance_id, user_id, status")
      .in("template_id", templateIds)

    if (recordsErr) throw recordsErr

    const uniqueUsers = new Set((records || []).map((r: any) => r.user_id))
    const signedCount = (records || []).filter((r: any) => r.status === "Signed").length
    const pendingCount = (records || []).filter((r: any) => r.status !== "Signed").length
    const clearanceIds = (records || []).map((r: any) => r.clearance_id)

    // 2. Fetch tasks count
    let tasksCount = 0
    if (clearanceIds.length > 0) {
      const { count } = await supabase
        .from("current_clearance_tasks")
        .select("*", { count: "exact", head: true })
        .in("clearance_id", clearanceIds)
      tasksCount = count || 0
    }

    return NextResponse.json({
      enrolledCount: uniqueUsers.size,
      signedCount,
      pendingCount,
      tasksCount,
      hasActiveClearances: signedCount > 0 || tasksCount > 0,
    })
  } catch (error: any) {
    console.error("Template impact check error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to calculate template impact" },
      { status: 500 }
    )
  }
}
