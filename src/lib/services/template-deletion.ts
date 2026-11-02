import { db } from "@/lib/db/index";
import { sql } from "drizzle-orm";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { invalidateServerAdminCache } from "@/lib/services/admin-cache";
import { invalidateServerDepartmentCache } from "@/lib/services/department-cache";
import { invalidateServerClearanceCache } from "@/lib/services/clearance-cache";
import { syncStudentCompletionNotification } from "@/lib/services/student-completion";

/**
 * Permanently hard-deletes specific clearance templates by their IDs and all related records:
 * - clearance_tasks
 * - clearance_records
 * - notifications (clearanceId, taskId, student completion, department alerts, admin completion notices)
 * - clearance_templates
 * and invalidates all server caches.
 */
export async function hardDeleteTemplatesByIds(templateIds: number[]) {
  if (!templateIds || templateIds.length === 0) return;
  const admin = getSupabaseAdmin();

  // 1. Fetch template metadata
  const { data: templates } = await admin
    .from("clearance_templates")
    .select("template_id, course_id, dept_id")
    .in("template_id", templateIds);

  const deptIds = Array.from(new Set((templates || []).map((t: any) => t.dept_id)));
  const courseIds = Array.from(
    new Set((templates || []).map((t: any) => t.course_id).filter(Boolean))
  );

  // Check if any course has 0 remaining templates after this deletion
  const fullyDeletedCourseIds: number[] = [];
  for (const cId of courseIds) {
    const { count } = await admin
      .from("clearance_templates")
      .select("template_id", { count: "exact", head: true })
      .eq("course_id", cId)
      .not("template_id", "in", `(${templateIds.join(",")})`);

    if (!count || count === 0) {
      fullyDeletedCourseIds.push(cId);
    }
  }

  // Fetch students under fully deleted courses
  let courseStudentIds: string[] = [];
  let courseSectionIds: number[] = [];
  if (fullyDeletedCourseIds.length > 0) {
    const { data: sections } = await admin
      .from("course_sections")
      .select("section_id")
      .in("course_id", fullyDeletedCourseIds);
    courseSectionIds = (sections || []).map((s: any) => s.section_id);
    if (courseSectionIds.length > 0) {
      const { data: enrolls } = await admin
        .from("enrollments")
        .select("student_id")
        .in("section_id", courseSectionIds);
      courseStudentIds = (enrolls || []).map((e: any) => e.student_id);
    }
  }

  // 2. Fetch clearance records for these templates
  const { data: records } = await admin
    .from("clearance_records")
    .select("clearance_id, user_id")
    .in("template_id", templateIds);

  const clearanceIds = (records || []).map((r: any) => r.clearance_id);
  const affectedUserIds = Array.from(
    new Set([...(records || []).map((r: any) => r.user_id), ...courseStudentIds].filter(Boolean))
  );

  // 3. Fetch tasks for these clearance records
  let taskIds: number[] = [];
  if (clearanceIds.length > 0) {
    const { data: tasks } = await admin
      .from("clearance_tasks")
      .select("assigned_task_id")
      .in("clearance_id", clearanceIds);
    taskIds = (tasks || []).map((t: any) => t.assigned_task_id);
  }

  // 4. Delete all associated notifications in 1 clean atomic query
  const clearanceIdList = clearanceIds.length > 0 ? clearanceIds.map((id) => `'${id}'`).join(",") : null;
  const taskIdList = taskIds.length > 0 ? taskIds.map((id) => `'${id}'`).join(",") : null;
  const userIdList = affectedUserIds.length > 0 ? affectedUserIds.map((u) => `'${u}'`).join(",") : null;
  const deptIdList = deptIds.length > 0 ? deptIds.join(",") : null;
  const fullyDeletedCourseIdList = fullyDeletedCourseIds.length > 0 ? fullyDeletedCourseIds.join(",") : null;
  const courseSectionIdList = courseSectionIds.length > 0 ? courseSectionIds.join(",") : null;
  const courseStudentIdList = courseStudentIds.length > 0 ? courseStudentIds.map((u) => `'${u}'`).join(",") : null;

  const notifConditions: string[] = [];

  if (clearanceIdList) {
    notifConditions.push(`metadata->>'clearanceId' IN (${clearanceIdList})`);
  }
  if (taskIdList) {
    notifConditions.push(`metadata->>'taskId' IN (${taskIdList})`);
  }

  // If courses are fully deleted, wipe all notifications for students under those courses
  if (fullyDeletedCourseIdList) {
    notifConditions.push(`course_id IN (${fullyDeletedCourseIdList})`);
  }
  if (courseSectionIdList) {
    notifConditions.push(`section_id IN (${courseSectionIdList})`);
  }
  if (courseStudentIdList) {
    notifConditions.push(`user_id IN (${courseStudentIdList})`);
    notifConditions.push(`metadata->>'studentId' IN (${courseStudentIdList})`);
    notifConditions.push(`metadata->>'clientId' IN (${courseStudentIdList})`);
  }

  if (userIdList) {
    notifConditions.push(
      `(user_id IN (${userIdList}) AND (title = 'Clearance Completed' OR metadata->>'type' = 'clearance_completion'))`
    );
    if (deptIdList) {
      notifConditions.push(`(user_id IN (${userIdList}) AND department_id IN (${deptIdList}))`);
      notifConditions.push(
        `(target_role = 'department' AND department_id IN (${deptIdList}) AND metadata->>'studentId' IN (${userIdList}))`
      );
    }
    notifConditions.push(
      `(target_role = 'admin' AND metadata->>'clientId' IN (${userIdList}) AND metadata->>'type' = 'completion')`
    );
  }

  if (notifConditions.length > 0) {
    await db.execute(sql.raw(`DELETE FROM public.notifications WHERE ${notifConditions.join(" OR ")}`));
  }

  // 5. Delete clearance_tasks, clearance_records, and clearance_templates
  if (clearanceIds.length > 0) {
    await admin.from("clearance_tasks").delete().in("clearance_id", clearanceIds);
  }
  await admin.from("clearance_records").delete().in("template_id", templateIds);
  await admin.from("clearance_templates").delete().in("template_id", templateIds);

  // 6. Invalidate server caches
  invalidateServerAdminCache();
  invalidateServerDepartmentCache();
  invalidateServerClearanceCache();
  for (const uid of affectedUserIds) {
    invalidateServerClearanceCache(uid);
  }

  // 7. Re-sync completion notifications for affected clients if they still have other active clearances
  for (const uid of affectedUserIds) {
    await syncStudentCompletionNotification(uid, admin);
  }
}

/**
 * Permanently hard-deletes course clearance templates and all related records:
 * - Wipes ALL notifications for students under the course (enrolled or having clearance records)
 * - Wipes course and section broadcast notifications
 * - Wipes department and admin alerts for those students
 * - Hard-deletes clearance_tasks
 * - Hard-deletes clearance_records
 * - Hard-deletes clearance_templates
 * and invalidates all server caches.
 */
export async function hardDeleteCourseTemplates(courseIds: number[]) {
  if (!courseIds || courseIds.length === 0) return;
  const admin = getSupabaseAdmin();

  // 1. Fetch all course sections under these courses
  const { data: sections } = await admin
    .from("course_sections")
    .select("section_id")
    .in("course_id", courseIds);

  const sectionIds = (sections || []).map((s: any) => s.section_id);

  // 2. Fetch all enrolled students under these sections
  let enrolledStudentIds: string[] = [];
  if (sectionIds.length > 0) {
    const { data: enrollments } = await admin
      .from("enrollments")
      .select("student_id")
      .in("section_id", sectionIds);
    enrolledStudentIds = (enrollments || []).map((e: any) => e.student_id);
  }

  // 3. Fetch all templates for these courses
  const { data: templates } = await admin
    .from("clearance_templates")
    .select("template_id, dept_id")
    .in("course_id", courseIds);

  const templateIds = (templates || []).map((t: any) => t.template_id);

  // 4. Fetch clearance records for these templates
  let recordStudentIds: string[] = [];
  let clearanceIds: number[] = [];
  if (templateIds.length > 0) {
    const { data: records } = await admin
      .from("clearance_records")
      .select("clearance_id, user_id")
      .in("template_id", templateIds);
    clearanceIds = (records || []).map((r: any) => r.clearance_id);
    recordStudentIds = (records || []).map((r: any) => r.user_id);
  }

  // 5. Fetch tasks for these clearance records
  let taskIds: number[] = [];
  if (clearanceIds.length > 0) {
    const { data: tasks } = await admin
      .from("clearance_tasks")
      .select("assigned_task_id")
      .in("clearance_id", clearanceIds);
    taskIds = (tasks || []).map((t: any) => t.assigned_task_id);
  }

  // 6. Gather ALL student user IDs under this course (enrolled + any with clearance records)
  const allStudentIds = Array.from(
    new Set([...enrolledStudentIds, ...recordStudentIds].filter(Boolean))
  );

  // 7. Atomic wipe of ALL notifications for the course and all students under that course
  const courseIdList = courseIds.join(",");
  const sectionIdList = sectionIds.length > 0 ? sectionIds.join(",") : null;
  const clearanceIdList = clearanceIds.length > 0 ? clearanceIds.map((id) => `'${id}'`).join(",") : null;
  const taskIdList = taskIds.length > 0 ? taskIds.map((id) => `'${id}'`).join(",") : null;
  const studentIdList = allStudentIds.length > 0 ? allStudentIds.map((u) => `'${u}'`).join(",") : null;

  const notifConditions: string[] = [];
  notifConditions.push(`course_id IN (${courseIdList})`);

  if (sectionIdList) {
    notifConditions.push(`section_id IN (${sectionIdList})`);
  }
  if (clearanceIdList) {
    notifConditions.push(`metadata->>'clearanceId' IN (${clearanceIdList})`);
  }
  if (taskIdList) {
    notifConditions.push(`metadata->>'taskId' IN (${taskIdList})`);
  }
  if (studentIdList) {
    // Wipe ALL notifications belonging to the students under this course
    notifConditions.push(`user_id IN (${studentIdList})`);
    // Wipe department notifications regarding these students
    notifConditions.push(`metadata->>'studentId' IN (${studentIdList})`);
    // Wipe admin notifications regarding these students
    notifConditions.push(`metadata->>'clientId' IN (${studentIdList})`);
  }

  if (notifConditions.length > 0) {
    await db.execute(sql.raw(`DELETE FROM public.notifications WHERE ${notifConditions.join(" OR ")}`));
  }

  // 8. Delete clearance_tasks, clearance_records, and clearance_templates
  if (clearanceIds.length > 0) {
    await admin.from("clearance_tasks").delete().in("clearance_id", clearanceIds);
  }
  if (templateIds.length > 0) {
    await admin.from("clearance_records").delete().in("template_id", templateIds);
    await admin.from("clearance_templates").delete().in("template_id", templateIds);
  } else {
    await admin.from("clearance_templates").delete().in("course_id", courseIds);
  }

  // 9. Invalidate server caches
  invalidateServerAdminCache();
  invalidateServerDepartmentCache();
  invalidateServerClearanceCache();
  for (const uid of allStudentIds) {
    invalidateServerClearanceCache(uid);
  }
}

/**
 * Permanently hard-deletes staff clearance templates and all related records:
 * - clearance_tasks
 * - clearance_records
 * - notifications
 * - clearance_templates
 * and invalidates all server caches.
 */
export async function hardDeleteStaffTemplates(deptIds: number[]) {
  if (!deptIds || deptIds.length === 0) return;
  const admin = getSupabaseAdmin();

  // 1. Fetch staff templates (course_id IS NULL)
  const { data: templates } = await admin
    .from("clearance_templates")
    .select("template_id")
    .in("dept_id", deptIds)
    .is("course_id", null);

  const templateIds = (templates || []).map((t: any) => t.template_id);

  if (templateIds.length > 0) {
    await hardDeleteTemplatesByIds(templateIds);
  } else {
    await admin.from("clearance_templates").delete().in("dept_id", deptIds).is("course_id", null);
    invalidateServerAdminCache();
    invalidateServerDepartmentCache();
  }
}

/**
 * On staff reassignment for a template (course or staff template),
 * removes all clearance tasks assigned by the previous staff officer,
 * purges any associated task notifications, resets any 'Incomplete'
 * clearance records back to 'Pending', and invalidates server caches.
 */
export async function removeTasksOnStaffReassignment(templateId: number, formerStaffId: string) {
  if (!templateId) return;
  const admin = getSupabaseAdmin();

  // 1. Fetch clearance records for this template
  const { data: records } = await admin
    .from("clearance_records")
    .select("clearance_id, user_id, status")
    .eq("template_id", templateId);

  if (!records || records.length === 0) return;
  const clearanceIds = records.map((r: any) => r.clearance_id);
  const userIds = Array.from(new Set(records.map((r: any) => r.user_id).filter(Boolean)));

  // 2. Fetch all tasks assigned under these clearance records
  let taskQuery = admin
    .from("clearance_tasks")
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
      .from("clearance_tasks")
      .delete()
      .in("assigned_task_id", taskIds);
  }

  // 5. Revert any 'Incomplete' clearance records back to 'Pending'
  const incompleteIds = records
    .filter((r: any) => r.status === "Incomplete")
    .map((r: any) => r.clearance_id);

  if (incompleteIds.length > 0) {
    await admin
      .from("clearance_records")
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

