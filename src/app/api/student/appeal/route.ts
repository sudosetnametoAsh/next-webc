import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { invalidateServerClearanceCache } from "@/lib/services/clearance-cache";
import { invalidateServerDepartmentCache } from "@/lib/services/department-cache";

const AppealSchema = z.object({
  taskId: z.coerce.number(),
  studentId: z.string(),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = AppealSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid appeal payload", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { taskId, studentId, reason } = parseResult.data;
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch current task to inspect status, existing AI audit report, title, and clearance_id
    const { data: task, error: fetchError } = await supabaseAdmin
      .from("clearance_tasks")
      .select("assigned_task_id, status, ai_audit_report, title, clearance_id")
      .eq("assigned_task_id", taskId)
      .single();

    if (fetchError || !task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Resolve department details from clearance record
    let deptId: number | null = null;
    let deptName = "Department";

    if (task.clearance_id) {
      const { data: clearanceData } = await supabaseAdmin
        .from("clearance_records")
        .select(`
          clearance_id,
          template_id,
          clearance_templates (
            dept_id,
            clearance_departments (
              dept_id,
              dept_name
            )
          )
        `)
        .eq("clearance_id", task.clearance_id)
        .maybeSingle();

      const templates: any = clearanceData?.clearance_templates;
      if (templates) {
        deptId = templates.dept_id ?? templates.clearance_departments?.dept_id ?? null;
        deptName = templates.clearance_departments?.dept_name ?? deptName;
      }
    }

    // Resolve client name
    let clientName = "Student";
    const { data: studentRecord } = await supabaseAdmin
      .from("students")
      .select("student_name")
      .eq("student_id", studentId)
      .maybeSingle();

    if (studentRecord?.student_name) {
      clientName = studentRecord.student_name;
    } else {
      const { data: staffRecord } = await supabaseAdmin
        .from("staffs")
        .select("staff_name")
        .eq("staff_id", studentId)
        .maybeSingle();
      if (staffRecord?.staff_name) {
        clientName = staffRecord.staff_name;
      }
    }

    // 2. Parse existing ai_audit_report
    let existingReport: any = {};
    if (task.ai_audit_report) {
      if (typeof task.ai_audit_report === "string") {
        try {
          existingReport = JSON.parse(task.ai_audit_report);
        } catch {
          existingReport = {};
        }
      } else if (typeof task.ai_audit_report === "object") {
        existingReport = { ...task.ai_audit_report };
      }
    }

    const appealPayload = {
      status: "pending",
      appealed_at: new Date().toISOString(),
      student_id: studentId,
      reason: reason?.trim() || "Student appealed early AI audit authenticity flag.",
    };

    const updatedReport = {
      ...existingReport,
      appeal: appealPayload,
    };

    // 3. Update clearance_tasks without changing task.status ("Flagged" remains in DB)
    const { error: updateError } = await supabaseAdmin
      .from("clearance_tasks")
      .update({
        ai_audit_report: updatedReport,
      })
      .eq("assigned_task_id", taskId);

    if (updateError) {
      console.error("Failed to update task appeal:", updateError);
      return NextResponse.json(
        { error: "Failed to submit appeal" },
        { status: 500 }
      );
    }

    // Invalidate server-side clearance cache & department cache
    invalidateServerClearanceCache(studentId);
    invalidateServerDepartmentCache();

    // 4. Dispatch notification to the department for authenticity check appeal
    if (deptId) {
      try {
        // Mark any prior unread flagged/submission notifications for this task as read
        await supabaseAdmin
          .from("notifications")
          .update({ is_read: true })
          .eq("department_id", deptId)
          .eq("target_role", "department")
          .eq("is_read", false)
          .or(`metadata->>taskId.eq.${taskId},ref_url.ilike.%taskId=${taskId}%`);

        const notifTitle = "Authenticity Appeal Submitted";
        const notifDesc = `${clientName} appealed authenticity check for "${task.title}".`;
        const refUrl = `/department/clients?status=submissions&clientId=${encodeURIComponent(studentId)}&taskId=${encodeURIComponent(taskId)}`;

        await supabaseAdmin.from("notifications").insert({
          department_id: deptId,
          target_role: "department",
          category: "submission",
          title: notifTitle,
          description: notifDesc,
          type: "Alert",
          ref_url: refUrl,
          is_read: false,
          metadata: {
            studentId,
            studentName: clientName,
            taskId,
            taskTitle: task.title,
            departmentId: deptId,
            departmentName: deptName,
            status: "Flagged",
            hasAppeal: true,
          },
        });
      } catch (notifError) {
        console.error("Failed to insert appeal notification to department:", notifError);
      }
    }

    return NextResponse.json({
      success: true,
      taskId,
      ai_audit_report: updatedReport,
      appeal: appealPayload,
    });
  } catch (error: any) {
    console.error("Appeal submission error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
