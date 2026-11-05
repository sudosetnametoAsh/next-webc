import { getSession } from "@/lib/auth/get-session";
import { createClient } from "@/lib/db/supabase-server";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { invalidateServerDepartmentCache } from "@/lib/services/department-cache";
import { invalidateServerClearanceCache } from "@/lib/services/clearance-cache";
import { after, NextRequest, NextResponse } from "next/server";

type Params = {
  clearanceId: string;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const supabase = await createClient();
  const { user_id } = await getSession();
  const { clearanceId } = await params;

  const { data: tasks, error } = await supabase
    .from("current_clearance_tasks")
    .select(
      `
        assigned_task_id,
        task_id,
        title,
        status,
        dropbox,
        description,
        assigned_at,
        due_date
      `,
    )
    .eq("clearance_id", clearanceId)
    .eq("staff_id", user_id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: tasks }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { user_id } = await getSession();
  const body = await req.json();
  const tasksToProcess = Array.isArray(body) ? body : [body];

  if (tasksToProcess.length === 0) {
    return NextResponse.json({ error: "No tasks provided" }, { status: 400 });
  }

  // 1. Identify target clearance_ids
  const clearanceIds = [
    ...new Set(tasksToProcess.map((task) => String(task.clearance_id))),
  ];

  // 2. Fetch existing tasks for these clearance records
  const { data: existingTasks, error: fetchError } = await supabase
    .from("current_clearance_tasks")
    .select("clearance_id, task_id, title")
    .in("clearance_id", clearanceIds);

  if (fetchError) {
    console.error("Error checking existing tasks:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  // 3. Filter out any task that is already assigned to the target clearance_id
  const nonDuplicateTasks = tasksToProcess.filter((newTask) => {
    const isDuplicate = existingTasks?.some((existing) => {
      if (String(existing.clearance_id) !== String(newTask.clearance_id)) {
        return false;
      }
      // Check matching preset task_id (if both have task_id)
      if (
        newTask.task_id != null &&
        existing.task_id != null &&
        String(newTask.task_id) === String(existing.task_id)
      ) {
        return true;
      }
      // Check matching title (case-insensitive)
      if (
        newTask.title &&
        existing.title &&
        newTask.title.trim().toLowerCase() === existing.title.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    });

    return !isDuplicate;
  });

  if (nonDuplicateTasks.length === 0) {
    return NextResponse.json(
      { error: "The selected task(s) have already been assigned to this client." },
      { status: 400 }
    );
  }

  const { data: clearanceTasks, error: insertError } = await supabase
    .from("current_clearance_tasks")
    .insert(nonDuplicateTasks).select(`
      assigned_task_id,
      task_id,
      description,
      status,
      clearance_id,
      due_date
    `);

  if (insertError) {
    console.error("Task Insert Error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const updatedClearanceIds = [
    ...new Set(clearanceTasks.map((task) => task.clearance_id)),
  ];

  if (updatedClearanceIds.length > 0) {
    const { error: updateError } = await supabase
      .from("current_clearance_records")
      .update({ status: "Incomplete" })
      .in("clearance_id", updatedClearanceIds);

    if (updateError) {
      console.error("Clearance Update Error:", updateError);
      return NextResponse.json(
        { error: "Tasks created, but failed to update clearance status." },
        { status: 500 },
      );
    }
  }

  const taskTitle = nonDuplicateTasks[0]?.title || "Clearance Requirement";

  // Create notifications for the students receiving these tasks
  if (updatedClearanceIds.length > 0) {
    try {
      const adminClient = getSupabaseAdmin();
      const { data: recordsData, error: recErr } = await adminClient
        .from("current_clearance_records")
        .select(`
          clearance_id,
          user_id,
          clearance_templates (
            clearance_departments (
              dept_name
            )
          )
        `)
        .in("clearance_id", updatedClearanceIds);

      if (recErr) {
        console.error("Fetch clearance records for notif error:", recErr);
      }

      if (recordsData && recordsData.length > 0) {
        const notifsToInsert: any[] = [];
        for (const task of nonDuplicateTasks) {
          const record = recordsData.find((r: any) => String(r.clearance_id) === String(task.clearance_id));
          if (!record) continue;

          const tpl = Array.isArray(record.clearance_templates)
            ? record.clearance_templates[0]
            : record.clearance_templates;
          const dept = Array.isArray(tpl?.clearance_departments)
            ? tpl.clearance_departments[0]
            : tpl?.clearance_departments;
          const deptName = dept?.dept_name || "department staff";

          const insertedTask = clearanceTasks?.find(
            (ct: any) =>
              String(ct.clearance_id) === String(record.clearance_id) &&
              (ct.task_id ? ct.task_id === task.task_id : ct.description === task.description)
          );
          const assignedTaskId = insertedTask?.assigned_task_id;

          notifsToInsert.push({
            user_id: record.user_id,
            target_role: "student",
            category: "task",
            title: "New Requirement Assigned",
            description: `"${task.title || "Clearance Requirement"}" was assigned by ${deptName}.`,
            type: "Info",
            ref_url: assignedTaskId ? `/clearance/tasks?taskId=${assignedTaskId}` : "/clearance/tasks",
            is_read: false,
            metadata: {
              studentId: record.user_id,
              clearanceId: record.clearance_id,
              taskId: assignedTaskId,
              taskTitle: task.title,
              departmentName: deptName,
            },
            created_at: new Date().toISOString(),
          });
        }

        if (notifsToInsert.length > 0) {
          const { error: notifInsertErr } = await adminClient.from("notifications").insert(notifsToInsert);
          if (notifInsertErr) {
            console.error("Failed to insert student notifications for assigned tasks:", notifInsertErr);
          }
        }
      }
    } catch (notifErr) {
      console.error("Failed to insert student notifications for assigned tasks:", notifErr);
    }
  }

  invalidateServerDepartmentCache(user_id);
  invalidateServerClearanceCache();

  return NextResponse.json({ data: clearanceTasks });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { user_id } = await getSession();
  const body = await req.json();
  const { assigned_task_id, title, description, due_date, dropbox } = body;

  if (!assigned_task_id) {
    return NextResponse.json(
      { error: "assigned_task_id is required" },
      { status: 400 },
    );
  }

  // Get previous task details to update notifications if title changes
  let oldTitle: string | null = null;
  if (title !== undefined) {
    const { data: current, error: readError } = await supabase
      .from("current_clearance_tasks")
      .select("title")
      .eq("assigned_task_id", assigned_task_id)
      .eq("staff_id", user_id)
      .maybeSingle();
    if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
    if (!current) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    oldTitle = current?.title || null;
  }

  const updateFields: Record<string, any> = {};
  if (title !== undefined) updateFields.title = title;
  if (description !== undefined) updateFields.description = description;
  if (due_date !== undefined) updateFields.due_date = due_date || null;
  if (dropbox !== undefined) updateFields.dropbox = dropbox;

  const { data: updatedTask, error: updateError } = await supabase
    .from("current_clearance_tasks")
    .update(updateFields)
    .eq("assigned_task_id", assigned_task_id)
    .eq("staff_id", user_id)
    .select(`assigned_task_id, title, description, due_date, dropbox, status`)
    .single();

  if (updateError) {
    console.error("Task update error:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Publish fresh client data immediately after the task write commits.
  invalidateServerDepartmentCache(user_id);
  invalidateServerClearanceCache();

  after(async () => {
    // If task title changed, synchronize notifications mentioning this task
    if (title && oldTitle && title !== oldTitle) {
      try {
        const adminClient = getSupabaseAdmin();
        const { data: matchedNotifs } = await adminClient
          .from("notifications")
          .select("notif_id, description, metadata")
          .ilike("description", `%"${oldTitle}"%`);

        if (matchedNotifs && matchedNotifs.length > 0) {
          for (const n of matchedNotifs) {
            const updatedDesc = n.description.replace(`"${oldTitle}"`, `"${title}"`);
            const updatedMeta = { ...(n.metadata || {}), taskTitle: title };
            await adminClient
              .from("notifications")
              .update({ description: updatedDesc, metadata: updatedMeta })
              .eq("notif_id", n.notif_id);
          }
        }
      } catch (notifUpdateErr) {
        console.error("Failed to update notification titles:", notifUpdateErr);
      }
    }
  });

  return NextResponse.json({ data: updatedTask }, { status: 200 });
}

export async function DELETE(
  req: NextRequest,
) {
  const supabase = await createClient();
  const { user_id } = await getSession();
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json(
      { error: "taskId is required" },
      { status: 400 },
    );
  }

  const adminClient = getSupabaseAdmin();

  // Get task title and associated clearance_records.user_id before deleting
  const { data: existingTask } = await adminClient
    .from("current_clearance_tasks")
    .select(`
      assigned_task_id,
      title,
      clearance_id,
      clearance_records (
        user_id
      )
    `)
    .eq("assigned_task_id", taskId)
    .maybeSingle();

  const taskTitle = existingTask?.title;
  const clearanceRecord = Array.isArray(existingTask?.clearance_records)
    ? existingTask.clearance_records[0]
    : existingTask?.clearance_records;
  const studentUserId = clearanceRecord?.user_id;

  const { error: deleteError } = await supabase
    .from("current_clearance_tasks")
    .delete()
    .eq("assigned_task_id", taskId)
    .eq("staff_id", user_id);

  if (deleteError) {
    console.error("Task delete error:", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // If no unfulfilled tasks remain for this clearance record, reset status back to Pending
  const targetClearanceId = existingTask?.clearance_id;
  if (targetClearanceId) {
    const { data: remainingTasks } = await adminClient
      .from("current_clearance_tasks")
      .select("status")
      .eq("clearance_id", targetClearanceId);

    const hasUnfulfilled = (remainingTasks || []).some(
      (t: any) => t.status !== "Cleared" && t.status !== "Completed"
    );

    if (!hasUnfulfilled) {
      await adminClient
        .from("current_clearance_records")
        .update({ status: "Pending" })
        .eq("clearance_id", targetClearanceId)
        .eq("status", "Incomplete");
    }
  }

  // Automatically delete all notifications associated with this deleted task
  try {
    // 1. Delete notifications referencing this specific task via metadata
    await adminClient
      .from("notifications")
      .delete()
      .filter("metadata->>taskId", "eq", String(taskId));

    // 2. Also delete notifications for this student mentioning this task title
    if (taskTitle && studentUserId) {
      await adminClient
        .from("notifications")
        .delete()
        .eq("user_id", studentUserId)
        .ilike("description", `%"${taskTitle}"%`);
    }
  } catch (notifDeleteErr) {
    console.error("Failed to delete notifications for deleted task:", notifDeleteErr);
  }

  invalidateServerDepartmentCache(user_id);
  if (studentUserId) {
    invalidateServerClearanceCache(studentUserId);
  } else {
    invalidateServerClearanceCache();
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
