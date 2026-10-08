import { authenticateRequest } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/db/supabase-server";
import { logActivity } from "@/lib/log-activity";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req, ["Staff", "Department", "Admin"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const supabase = await createClient();
    const { user_id, department } = auth.session;

    // 1. Get all templates belonging to this staff member
    const { data: templates, error: templateError } = await supabase
      .from("clearance_templates")
      .select(`
        template_id, 
        course_id, 
        dept_id,
        courses(course_name),
        departments:clearance_departments(dept_name, signing_order)
      `)
      .eq("staff_id", user_id);

    if (templateError || !templates || templates.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const templateIds = templates.map((t) => t.template_id);

    // Determine current staff's department signing order
    const firstDept = Array.isArray(templates[0]?.departments)
      ? templates[0].departments[0]
      : templates[0]?.departments;
    const currentStaffOrder = (firstDept as any)?.signing_order ?? 2;

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

    // 3. Filter for candidates who have at least 1 task AND all tasks are Cleared/Submitted (0 Pending)
    const candidates = (records || []).filter((rec: any) => {
      const tasks = rec.clearance_tasks || [];
      if (tasks.length === 0) return false; // Must have tasks assigned
      return tasks.every(
        (t: any) => t.status === "Cleared" || t.status === "Submitted" || t.status === "Flagged"
      );
    });

    if (candidates.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // 4. If current staff is in Tier > 1, verify dynamic prerequisite clearance status
    const candidateUserIds = Array.from(new Set(candidates.map((r: any) => r.user_id)));
    const blockedUserIds = new Set<string>();

    if (currentStaffOrder > 1 && candidateUserIds.length > 0) {
      const { data: allStudentClearances } = await supabase
        .from("clearance_records")
        .select(`
          user_id,
          status,
          clearance_templates (
            dept_id,
            departments:clearance_departments (
              dept_name,
              signing_order
            )
          )
        `)
        .in("user_id", candidateUserIds);

      if (allStudentClearances) {
        for (const item of allStudentClearances) {
          const t = Array.isArray(item.clearance_templates)
            ? item.clearance_templates[0]
            : item.clearance_templates;
          const d = Array.isArray(t?.departments) ? t.departments[0] : t?.departments;
          const deptOrder = (d as any)?.signing_order ?? 2;

          // If a lower-order prerequisite department is NOT signed, student is blocked
          if (deptOrder < currentStaffOrder && item.status !== "Signed") {
            blockedUserIds.add(item.user_id);
          }
        }
      }
    }

    // 5. Construct final priority list, excluding any students blocked by prerequisites
    const priorityList = candidates
      .filter((rec: any) => !blockedUserIds.has(rec.user_id))
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
  const auth = await authenticateRequest(req, ["Staff", "Department", "Admin"]);
  if ("errorResponse" in auth) return auth.errorResponse;

  try {
    const supabase = await createClient();
    const { user_id, user_name } = auth.session;
    const { clearance_ids } = await req.json();

    if (!Array.isArray(clearance_ids) || clearance_ids.length === 0) {
      return NextResponse.json(
        { error: "clearance_ids must be a non-empty array." },
        { status: 400 }
      );
    }

    // Verify template ownership: only sign records belonging to this staff member's templates
    const { data: staffTemplates } = await supabase
      .from("clearance_templates")
      .select("template_id")
      .eq("staff_id", user_id);

    const validTemplateIds = (staffTemplates || []).map((t) => t.template_id);
    if (validTemplateIds.length === 0) {
      return NextResponse.json(
        { error: "No authorized clearance templates found for this account." },
        { status: 403 }
      );
    }

    const signedAt = new Date().toISOString();

    const { data: updatedData, error: updateError } = await supabase
      .from("clearance_records")
      .update({
        status: "Signed",
        signed_at: signedAt,
      })
      .in("clearance_id", clearance_ids)
      .in("template_id", validTemplateIds)
      .select(`users(students(phone_number))`);

    if (updateError) {
      console.error("Quick sign update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const signedCount = updatedData?.length ?? clearance_ids.length;

    await logActivity(
      user_id,
      "Quick Sign Priority",
      `Quick-signed ${signedCount} priority clearance(s) via Dashboard.`
    );

    return NextResponse.json(
      { success: true, count: signedCount },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in quick-sign POST:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
