import type { ClearanceDataResponse } from '@/hooks/clearance/use-clearance-data';

// Realtime task rows do not contain joined department/staff fields. Preserve them,
// and never add a task which is not already in this client's authorized bundle.
export function applyTaskEdit(bundle: ClearanceDataResponse | undefined, row: Record<string, unknown>) {
  if (!bundle || typeof row.assigned_task_id !== 'number') return bundle;
  let changed = false;
  const fields = ['title', 'description', 'due_date', 'dropbox', 'status', 'uploaded_at', 'comments', 'ai_audit_report'] as const;
  const tasks = bundle.tasks.map(task => {
    if (task.assigned_task_id !== row.assigned_task_id) return task;
    const patch: Record<string, unknown> = {};
    for (const key of fields) if (Object.hasOwn(row, key) && row[key] !== task[key]) patch[key] = row[key];
    if (!Object.keys(patch).length) return task;
    changed = true;
    return { ...task, ...patch } as typeof task;
  });
  return changed ? { ...bundle, tasks } : bundle;
}
