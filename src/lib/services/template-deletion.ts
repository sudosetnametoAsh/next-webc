import { db } from "@/lib/db/index";
import { sql } from "drizzle-orm";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { invalidateServerAdminCache } from "@/lib/services/admin-cache";
import { invalidateServerDepartmentCache } from "@/lib/services/department-cache";
import { invalidateServerClearanceCache } from "@/lib/services/clearance-cache";
import { syncStudentCompletionNotification } from "@/lib/services/student-completion";

/** Archive reusable templates while preserving every period's records and submissions. */
export async function archiveTemplatesByIds(templateIds: number[]) {
  if (!templateIds.length) return;
  const { error } = await getSupabaseAdmin().from("clearance_templates").update({ is_active: false }).in("template_id", templateIds);
  if (error) throw error;
  invalidateServerAdminCache();
  invalidateServerDepartmentCache();
  invalidateServerClearanceCache();
}

export async function archiveCourseTemplates(courseIds: number[]) {
  if (!courseIds.length) return;
  const { data, error } = await getSupabaseAdmin().from("clearance_templates").select("template_id").in("course_id", courseIds);
  if (error) throw error;
  await archiveTemplatesByIds((data || []).map((item: { template_id: number }) => item.template_id));
}

export async function archiveStaffTemplates(deptIds: number[]) {
  if (!deptIds.length) return;
  const { data, error } = await getSupabaseAdmin().from("clearance_templates").select("template_id").is("course_id", null).in("dept_id", deptIds);
  if (error) throw error;
  await archiveTemplatesByIds((data || []).map((item: { template_id: number }) => item.template_id));
}

// Keep existing callers compatible while template removal uses archival semantics.
/** @deprecated Use archiveTemplatesByIds; records and submissions are preserved. */
export const hardDeleteTemplatesByIds = archiveTemplatesByIds;
/** @deprecated Use archiveCourseTemplates; records and submissions are preserved. */
export const hardDeleteCourseTemplates = archiveCourseTemplates;
/** @deprecated Use archiveStaffTemplates; records and submissions are preserved. */
export const hardDeleteStaffTemplates = archiveStaffTemplates;

/** Reassignments affect only the current period's tasks. */
export async function removeTasksOnStaffReassignment(templateId: number, formerStaffId: string) {
  if (!templateId) return;
  const admin = getSupabaseAdmin();

  // 1. Fetch clearance records for this template
  const { data: records } = await admin
    .from("current_clearance_records")
    .select("clearance_id, user_id, status")
    .eq("template_id", templateId);

  if (!records || records.length === 0) return;
  const clearanceIds = records.map((r: any) => r.clearance_id);
  const userIds = Array.from(new Set(records.map((r: any) => r.user_id).filter(Boolean)));

  // 2. Fetch all tasks assigned under these clearance records
  let taskQuery = admin
    .from("current_clearance_tasks")
    .select("assigned_task_id, title")
    .in("clearance_id", clearanceIds);

  if (formerStaffId) {
    taskQuery = taskQuery.eq("staff_id", formerStaffId);
  }

  const { data: tasks } = await taskQuery;
  const taskIds = (tasks || []).map((t: any) => t.assigned_task_id);

  // 3. Purge notifications tied to these tasks
  if (taskIds.length > 0) {
    const taskIdList = taskIds.map((id) => `'${id}'`).join(",");
    const notifConditions = [`metadata->>'taskId' IN (${taskIdList})`];

    // Also clean up notifications matching task titles for these students
    for (const task of tasks || []) {
      if (task.title && userIds.length > 0) {
        const uList = userIds.map((u) => `'${u}'`).join(",");
        const safeTitle = String(task.title).replace(/'/g, "''");
        notifConditions.push(
          `(user_id IN (${uList}) AND description ILIKE '%"${safeTitle}"%')`
        );
      }
    }

    try {
      await db.execute(
        sql.raw(`DELETE FROM public.notifications WHERE ${notifConditions.join(" OR ")}`)
      );
    } catch (notifErr) {
      console.error("Failed to delete notifications on staff reassignment:", notifErr);
    }

    // 4. Delete the tasks from clearance_tasks
    await admin
      .from("current_clearance_tasks")
      .delete()
      .in("assigned_task_id", taskIds);
  }

  // 5. Revert any 'Incomplete' clearance records back to 'Pending'
  const incompleteIds = records
    .filter((r: any) => r.status === "Incomplete")
    .map((r: any) => r.clearance_id);

  if (incompleteIds.length > 0) {
    await admin
      .from("current_clearance_records")
      .update({ status: "Pending" })
      .in("clearance_id", incompleteIds);
  }

  // 6. Invalidate server caches
  invalidateServerAdminCache();
  invalidateServerDepartmentCache();
  invalidateServerClearanceCache();
  for (const uid of userIds) {
    invalidateServerClearanceCache(uid);
  }
}

