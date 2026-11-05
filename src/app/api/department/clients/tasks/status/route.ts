import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { invalidateServerClearanceCache } from "@/lib/services/clearance-cache";
import { invalidateServerDepartmentCache } from "@/lib/services/department-cache";

export async function PATCH(request: NextRequest) {
  try {
    const { user_id } = await getSession();
    const { taskId, status, comment } = await request.json();
    if (!Number.isSafeInteger(taskId) || taskId <= 0 || !["Cleared", "Pending"].includes(status) || typeof comment !== "string") {
      return NextResponse.json({ error: "A task, valid status, and feedback are required." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: task, error: readError } = await admin.from("current_clearance_tasks")
      .select("assigned_task_id, title, clearance_id, status, comments, clearance_records(user_id)")
      .eq("assigned_task_id", taskId).eq("staff_id", user_id).maybeSingle();
    if (readError) throw readError;
    if (!task) return NextResponse.json({ error: "Assigned task not found." }, { status: 404 });
    if (status === "Pending" && !["Cleared", "Pending"].includes(task.status)) {
      return NextResponse.json({ error: "Only a cleared requirement can be reopened. Refresh and try again." }, { status: 409 });
    }

    const changed = task.status !== status;
    const { data: saved, error: writeError } = await admin.from("current_clearance_tasks")
      .update({ status, comments: comment })
      .eq("assigned_task_id", taskId).eq("staff_id", user_id).eq("status", task.status)
      .select("assigned_task_id, status, comments").single();
    if (writeError) throw writeError;
    if (!saved || saved.status !== status) throw new Error("Task status was not saved.");

    const record = Array.isArray(task.clearance_records) ? task.clearance_records[0] : task.clearance_records;
    const studentId = record?.user_id;
    // Invalidate immediately, including when a later summary/notification step fails.
    invalidateServerDepartmentCache(user_id);
    if (studentId) invalidateServerClearanceCache(studentId);

    // Read the persisted sibling tasks rather than the browser's possibly stale list.
    const { data: siblings, error: siblingsError } = await admin.from("current_clearance_tasks")
      .select("assigned_task_id, status").eq("clearance_id", task.clearance_id);
    if (siblingsError) throw siblingsError;
    const nextStatus = (siblings || []).some((item) => item.status !== "Cleared") ? "Incomplete" : "Pending";
    const { error: summaryError } = await admin.from("current_clearance_records")
      .update({ status: nextStatus }).eq("clearance_id", task.clearance_id).neq("status", "Signed");
    if (summaryError) throw summaryError;
    invalidateServerDepartmentCache(user_id);
    if (studentId) invalidateServerClearanceCache(studentId);

    if (studentId) {
      const titles = status === "Cleared" ? ["Submission Returned", "Submission Rejected"] : ["Requirement Cleared"];
      const { error: cleanupError } = await admin.from("notifications").delete()
        .eq("user_id", studentId).in("title", titles).contains("metadata", { taskId });
      if (cleanupError) console.error("Task notification cleanup failed:", cleanupError);
      if (status === "Cleared" && changed) {
        const { error: notificationError } = await admin.from("notifications").insert({
          user_id: studentId, target_role: "student", category: "task", title: "Requirement Cleared",
          description: `Your requirement "${task.title || "Clearance Requirement"}" has been approved and cleared.`,
          type: "Success", ref_url: `/clearance/tasks?taskId=${taskId}`, is_read: false,
          metadata: { studentId, taskId, taskTitle: task.title },
        });
        if (notificationError) console.error("Task cleared notification failed:", notificationError);
      }
    }
    return NextResponse.json({ data: saved });
  } catch (error) {
    console.error("Task status update failed:", error);
    return NextResponse.json({ error: "Could not complete the task update. Please refresh and try again." }, { status: 500 });
  }
}
