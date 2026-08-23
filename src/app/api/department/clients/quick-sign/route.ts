import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/db/supabase-server";
import { logActivity } from "@/lib/log-activity";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { user_id, department } = await getSession();

    // 1. Get all templates belonging to this staff member
    const { data: templates, error: templateError } = await supabase
      .from("clearance_templates")
      .select("template_id, course_id, courses(course_name)")
      .eq("staff_id", user_id);

    if (templateError || !templates || templates.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const templateIds = templates.map((t) => t.template_id);

    // 2. Fetch clearance records for these templates that are NOT yet signed
    const { data: records, error: recordError } = await supabase
      .from("clearance_records")
      .select(`
        clearance_id,
        user_id,
        status,
        template_id,
        clearance_tasks (
          assigned_task_id,
          title,
          status,
          uploaded_at
        ),
        users!inner (
          students (
            student_name,
            phone_number,
            enrollments (
              course_sections (
                section_number,
                year,
                semester,
                courses (
                  course_name
                )
              )
            )
          )
        )
      `)
      .in("template_id", templateIds)
      .neq("status", "Signed");

    if (recordError) {
      console.error("Error fetching priority records:", recordError);
      return NextResponse.json({ error: recordError.message }, { status: 500 });
    }

    // 3. Filter for students who have at least 1 task AND all tasks are Cleared/Submitted (0 Pending)
    const priorityList = (records || [])
      .filter((rec: any) => {
        const tasks = rec.clearance_tasks || [];
        if (tasks.length === 0) return false; // Must have tasks assigned
        return tasks.every((t: any) => t.status === "Cleared" || t.status === "Submitted" || t.status === "Flagged");
      })
      .map((rec: any) => {
        const student = Array.isArray(rec.users?.students) ? rec.users.students[0] : rec.users?.students;
        const enrollment = Array.isArray(student?.enrollments) ? student.enrollments[0] : student?.enrollments;
        const section = enrollment?.course_sections;
        const courseName = section?.courses?.course_name || "Enrolled Course";
        const sectionLabel = section ? `Year ${section.year} · Sec ${section.section_number}` : "";

        // Find the most recent task upload or assignment date
        const latestDate = rec.clearance_tasks
          .map((t: any) => t.uploaded_at)
          .filter(Boolean)
          .sort()
          .reverse()[0] || null;

        return {
          clearance_id: rec.clearance_id,
          student_id: rec.user_id,
          student_name: student?.student_name || "Unknown Student",
          course_name: courseName,
          section_label: sectionLabel,
          completed_tasks_count: rec.clearance_tasks.length,
          latest_activity: latestDate,
        };
      });

    return NextResponse.json({ data: priorityList }, { status: 200 });
  } catch (error: any) {
    console.error("Error in priority queue API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { user_id, user_name } = await getSession();
    const { clearance_ids } = await req.json();

    if (!Array.isArray(clearance_ids) || clearance_ids.length === 0) {
      return NextResponse.json(
        { error: "clearance_ids must be a non-empty array." },
        { status: 400 }
      );
    }

    const signedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("clearance_records")
      .update({
        status: "Signed",
        signed_at: signedAt,
      })
      .in("clearance_id", clearance_ids);

    if (updateError) {
      console.error("Quick sign update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await logActivity(
      user_id,
      "Quick Sign Priority",
      `Quick-signed ${clearance_ids.length} priority clearance(s) via Dashboard.`
    );

    return NextResponse.json(
      { success: true, count: clearance_ids.length },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in quick-sign POST:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
