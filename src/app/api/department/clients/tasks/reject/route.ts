import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { invalidateServerClearanceCache } from "@/lib/services/clearance-cache";
import { invalidateServerDepartmentCache } from "@/lib/services/department-cache";

export async function POST(request: NextRequest) {
  try {
    const { user_id } = await getSession();
    const { taskId, reason } = await request.json();
    if (!Number.isSafeInteger(taskId) || taskId <= 0 || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json({ error: "A task and rejection reason are required." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    // Scope the privileged write to the authenticated officer's assigned task.
    const { data: task, error: readError } = await admin.from("current_clearance_tasks")
      .select("assigned_task_id, title, clearance_id, status, ai_audit_report, clearance_records(user_id)")
      .eq("assigned_task_id", taskId).eq("staff_id", user_id).maybeSingle();
    if (readError) throw readError;
    if (!task) {
      return NextResponse.json({ error: "Assigned task not found." }, { status: 404 });
    }
    if (!["Submitted", "Verified", "Flagged"].includes(task.status)) {
      return NextResponse.json({ error: "This submission is no longer awaiting review. Refresh and try again." }, { status: 409 });
    }

    let report = task.ai_audit_report;
    if (typeof report === "string") {
      try { report = JSON.parse(report); } catch { report = null; }
    }
    if (report && typeof report === "object") {
      const { appeal: _appeal, ...rest } = report;
      report = Object.keys(rest).length ? rest : null;
    }

    const { data: saved, error: writeError } = await admin.from("current_clearance_tasks")
      .update({ status: "Rejected", comments: reason.trim(), ai_audit_report: report })
      .eq("assigned_task_id", taskId).eq("staff_id", user_id).eq("status", task.status)
      .select("assigned_task_id, status, comments, ai_audit_report").single();
    if (writeError) throw writeError;
    if (!saved || saved.status !== "Rejected") throw new Error("Rejection was not saved.");

    const record = Array.isArray(task.clearance_records) ? task.clearance_records[0] : task.clearance_records;
    const studentId = record?.user_id;
    invalidateServerDepartmentCache(user_id);
    if (studentId) invalidateServerClearanceCache(studentId);

    const { error: statusError } = await admin.from("current_clearance_records")
      .update({ status: "Incomplete" }).eq("clearance_id", task.clearance_id).neq("status", "Signed");
    if (statusError) console.error("Rejected task clearance status sync failed:", statusError);

    if (studentId) {
      const { error: notificationError } = await admin.from("notifications").insert({
        user_id: studentId, target_role: "student", category: "submission",
        title: "Submission Rejected",
        description: `Your submission for "${task.title || "requirement"}" was rejected. Reason: ${reason.trim()}`,
        type: "Warning", ref_url: `/clearance/tasks?taskId=${taskId}`, is_read: false,
        metadata: { studentId, taskId, taskTitle: task.title, reason: reason.trim() },
      });
      if (notificationError) console.error("Rejection notification failed:", notificationError);
    }
    return NextResponse.json({ data: saved });
  } catch (error) {
    console.error("Task rejection failed:", error);
    return NextResponse.json({ error: "Could not save rejection. Please try again." }, { status: 500 });
  }
}
