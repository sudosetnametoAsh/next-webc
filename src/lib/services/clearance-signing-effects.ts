import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchReadyForSigningNotifications } from "@/lib/services/ready-for-signing-notifications";
import { checkAndDispatchAdminCompletion, revokeAdminCompletion } from "@/lib/services/admin-notifications";
import { checkAndDispatchStudentCompletion, revokeStudentCompletionNotification } from "@/lib/services/student-completion";

type Department = { dept_id?: number; dept_name?: string };
type Template = { tier?: number | null; course_id?: number | null; clearance_departments: Department | Department[] | null };
export interface SigningRecord {
  clearance_id: number;
  user_id: string;
  clearance_templates: Template | Template[] | null;
}
interface Options {
  records: SigningRecord[];
  status: "Signed" | "Pending";
  signedAt: string | null;
  actorId: string;
  adminClient: SupabaseClient;
  userClient: SupabaseClient;
  isSingleRecordSign: boolean;
}

// Serialize notification effects for overlapping clients in this server process.
const pendingByClient = new Map<string, Promise<unknown>>();
async function queueForClients<T>(ids: string[], work: () => Promise<T>): Promise<T> {
  const previous = [...new Set(ids.map((id) => pendingByClient.get(id)).filter(Boolean))];
  const task = Promise.allSettled(previous).then(work);
  ids.forEach((id) => pendingByClient.set(id, task));
  try { return await task; }
  finally { ids.forEach((id) => { if (pendingByClient.get(id) === task) pendingByClient.delete(id); }); }
}
async function safely(label: string, work: () => Promise<unknown>) {
  try { await work(); } catch (error) { console.error(label, error); }
}
async function limited<T>(items: T[], work: (item: T) => Promise<unknown>) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(items.length, 4) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await safely("Clearance follow-up failed:", () => work(item));
    }
  }));
}
const templateOf = (record: SigningRecord) => Array.isArray(record.clearance_templates)
  ? record.clearance_templates[0] : record.clearance_templates;
const departmentOf = (record: SigningRecord) => {
  const department = templateOf(record)?.clearance_departments;
  return Array.isArray(department) ? department[0] : department;
};

async function reconcile(options: Options): Promise<SigningRecord[]> {
  const { adminClient: admin, records, status, isSingleRecordSign } = options;
  // Skip obsolete jobs (e.g. sign was undone before its callback began).
  let query = admin.from("current_clearance_records")
    .select("clearance_id, status").in("clearance_id", records.map((r) => r.clearance_id)).eq("status", status);
  if (status === "Signed") query = query.eq("signed_at", options.signedAt);
  const { data: current, error } = await query;
  if (error) throw error;
  const currentIds = new Set((current || []).map((r) => r.clearance_id));
  const active = records.filter((r) => currentIds.has(r.clearance_id));
  if (!active.length) return [];
  const users = [...new Set(active.map((r) => r.user_id))];

  await limited(active, async (record) => {
    const department = departmentOf(record);
    const { error: cleanupError } = await admin.from("notifications").delete()
      .eq("user_id", record.user_id).eq("title", "Clearance Signed Off")
      .contains("metadata", { clearanceId: record.clearance_id });
    if (cleanupError) throw cleanupError;
    if (status === "Signed") {
      const { error: insertError } = await admin.from("notifications").insert({
        user_id: record.user_id, target_role: "student", category: "clearance",
        title: "Clearance Signed Off",
        description: `Your clearance for ${department?.dept_name || "department staff"} has been approved and signed.`,
        type: "Success", ref_url: "/clearance", is_read: false,
        metadata: { studentId: record.user_id, clearanceId: record.clearance_id, departmentName: department?.dept_name },
      });
      if (insertError) throw insertError;
    }
  });

  if (status === "Signed") {
    await limited(active, async (record) => {
      const department = departmentOf(record);
      if (!department?.dept_id) return;
      const metadata = templateOf(record)?.course_id != null ? { studentId: record.user_id } : { staffId: record.user_id };
      const { error: cleanupError } = await admin.from("notifications").delete()
        .eq("department_id", department.dept_id).eq("title", "Ready for Signing").contains("metadata", metadata);
      if (cleanupError) throw cleanupError;
    });
    const tiers = new Map<string, Set<number>>();
    for (const record of active) {
      if (!tiers.has(record.user_id)) tiers.set(record.user_id, new Set());
      tiers.get(record.user_id)!.add(templateOf(record)?.tier ?? 1);
    }
    await safely("Downstream signing notifications failed:", () => dispatchReadyForSigningNotifications({
      signedUserIds: users, signedTiersByUser: tiers, adminClient: admin, isSingleRecordSign,
    }));
    await limited(users, (id) => Promise.all([
      checkAndDispatchAdminCompletion(id, admin), checkAndDispatchStudentCompletion(id, admin),
    ]));
  } else {
    await limited(users, async (id) => {
      await Promise.all([
        revokeAdminCompletion(id, admin), revokeStudentCompletionNotification(id, admin),
        ...["studentId", "staffId"].map(async (key) => {
          const { error: cleanupError } = await admin.from("notifications").delete()
            .eq("title", "Ready for Signing").contains("metadata", { [key]: id });
          if (cleanupError) throw cleanupError;
        }),
      ]);
    });
  }
  return status === "Signed" ? active : [];
}

export async function runClearanceSigningEffects(options: Options) {
  try {
    await queueForClients([...new Set(options.records.map((r) => r.user_id))], () => reconcile(options));
  } catch (error) { console.error("Clearance follow-up failed:", error); }
}
