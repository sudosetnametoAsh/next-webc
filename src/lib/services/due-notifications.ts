import { getSupabaseAdmin } from "@/lib/db/supabase-admin";

/**
 * Service to sync deadline and due date notifications for students/clients.
 * When a task is within 24 hours of its occurring deadline (and not cleared):
 * - Creates an in-app "Task Due Soon" notification with Warning styling.
 * - Deduplicates against existing notifications to ensure each task deadline is only notified once.
 * - Cleans up / marks read any obsolete due-soon notifications if the task becomes Cleared.
 */
export async function syncStudentDueNotifications(
  userId: string,
  supabase = getSupabaseAdmin()
) {
  if (!userId) return;

  try {
    const now = Date.now();
    const windowStart = now - 48 * 60 * 60 * 1000; // Allow recently reached deadline (< 48hrs ago)
    const windowEnd = now + 24 * 60 * 60 * 1000;   // 24 hours from now

    // 1. Fetch student's clearance records, departments, and clearance tasks
    const { data: records, error: recordErr } = await supabase
      .from("clearance_records")
      .select(`
        clearance_id,
        user_id,
        clearance_templates (
          is_active,
          clearance_departments (
            dept_id,
            dept_name
          )
        ),
        clearance_tasks (
          assigned_task_id,
          title,
          description,
          status,
          due_date
        )
      `)
      .eq("user_id", userId);

    if (recordErr || !records || records.length === 0) {
      return;
    }

    // 2. Collect qualifying tasks due within 24 hours (and not Cleared)
    interface QualifyingTask {
      taskId: number;
      taskTitle: string;
      dueDate: string;
      deptName: string;
      diffMs: number;
      hoursLeft: number;
    }

    const qualifyingTasks: QualifyingTask[] = [];
    const clearedTaskIds = new Set<number>();

    for (const record of records) {
      const template = Array.isArray(record.clearance_templates)
        ? record.clearance_templates[0]
        : record.clearance_templates;
      if (template?.is_active === false) {
        continue;
      }
      const dept = Array.isArray(template?.clearance_departments)
        ? template?.clearance_departments[0]
        : template?.clearance_departments;
      const deptName = dept?.dept_name || "Department";

      const tasks = Array.isArray(record.clearance_tasks)
        ? record.clearance_tasks
        : [];

      for (const t of tasks) {
        if (!t.due_date) continue;

        if (t.status === "Cleared") {
          clearedTaskIds.add(t.assigned_task_id);
          continue;
        }

        const dueTime = new Date(t.due_date).getTime();
        const diffMs = dueTime - now;

        // Condition: Due within 24 hours (diffMs <= 24hrs) and not older than 48 hours past deadline
        if (dueTime <= windowEnd && dueTime >= windowStart) {
          const hoursLeft = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
          qualifyingTasks.push({
            taskId: t.assigned_task_id,
            taskTitle: t.title,
            dueDate: t.due_date,
            deptName,
            diffMs,
            hoursLeft,
          });
        }
      }
    }

    // 3. Fetch existing due/deadline notifications for this user to prevent duplicates
    const { data: existingNotifs } = await supabase
      .from("notifications")
      .select("notif_id, metadata, title, is_read")
      .eq("user_id", userId)
      .or("category.eq.deadline,title.ilike.%due soon%,title.ilike.%deadline approaching%");

    // Mark read any due notifications for tasks that are now Cleared
    if (clearedTaskIds.size > 0 && existingNotifs && existingNotifs.length > 0) {
      const obsoleteNotifIds = existingNotifs
        .filter((n: any) => {
          const tid = Number(n.metadata?.taskId);
          return tid && clearedTaskIds.has(tid) && !n.is_read;
        })
        .map((n: any) => n.notif_id);

      if (obsoleteNotifIds.length > 0) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .in("notif_id", obsoleteNotifIds);
      }
    }

    if (qualifyingTasks.length === 0) {
      return;
    }

    // Check which task IDs already have a notification
    const alreadyNotifiedTaskIds = new Set<number>();
    (existingNotifs || []).forEach((n: any) => {
      const tid = Number(n.metadata?.taskId);
      if (tid) alreadyNotifiedTaskIds.add(tid);
    });

    const tasksToNotify = qualifyingTasks.filter(
      (qt) => !alreadyNotifiedTaskIds.has(qt.taskId)
    );

    if (tasksToNotify.length === 0) {
      return;
    }

    // 4. Batch insert new due notifications
    const newNotifications = tasksToNotify.map((qt) => {
      const formattedDate = new Date(qt.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      const title = `Task Due Soon: ${qt.taskTitle}`;
      const description =
        qt.diffMs > 0
          ? `"${qt.taskTitle}" for ${qt.deptName} is due in ${qt.hoursLeft} hour${qt.hoursLeft === 1 ? "" : "s"} (${formattedDate}). Please review and submit your requirement before the deadline.`
          : `"${qt.taskTitle}" for ${qt.deptName} was due on ${formattedDate} and is now overdue. Please review and complete your requirement.`;

      return {
        user_id: userId,
        target_role: "student",
        category: "deadline",
        title,
        description,
        type: "Warning",
        ref_url: `/clearance/tasks?taskId=${qt.taskId}`,
        is_read: false,
        metadata: {
          type: "task_due_soon",
          taskId: qt.taskId,
          taskTitle: qt.taskTitle,
          dueDate: qt.dueDate,
          departmentName: qt.deptName,
          refUrl: `/clearance/tasks?taskId=${qt.taskId}`,
        },
      };
    });

    const { error: insertErr } = await supabase
      .from("notifications")
      .insert(newNotifications);

    if (insertErr) {
      console.error("Error inserting due notifications:", insertErr);
    }
  } catch (err) {
    console.error("Error in syncStudentDueNotifications:", err);
  }
}
