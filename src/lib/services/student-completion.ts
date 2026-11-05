import { getSupabaseAdmin } from "@/lib/db/supabase-admin";

/**
 * Service to manage student/client "Clearance Completed" notification.
 * Triggered when all active clearance departments have approved and signed the client's clearance records.
 */
export async function syncStudentCompletionNotification(
  userId: string,
  adminClient = getSupabaseAdmin()
) {
  if (!userId) return;

  try {
    // 1. Fetch all active clearance records for this user
    const { data: records, error } = await adminClient
      .from("current_clearance_records")
      .select(`
        clearance_id,
        user_id,
        status,
        clearance_templates!inner(is_active)
      `)
      .eq("user_id", userId)
      .eq("clearance_templates.is_active", true);

    if (error) {
      return;
    }

    if (!records || records.length === 0) {
      await adminClient
        .from("notifications")
        .delete()
        .eq("user_id", userId)
        .eq("title", "Clearance Completed");
      return;
    }

    const allSigned = records.length > 0 && records.every((r: any) => r.status === "Signed");

    if (allSigned) {
      // Check if already notified
      const { data: existing } = await adminClient
        .from("notifications")
        .select("notif_id")
        .eq("user_id", userId)
        .eq("title", "Clearance Completed")
        .maybeSingle();

      if (!existing) {
        await adminClient.from("notifications").insert({
          user_id: userId,
          target_role: "student",
          category: "completion",
          title: "Clearance Completed",
          description:
            "Congratulations! All clearance departments have approved and signed your clearance. You may now export and print your official signed clearance copy.",
          type: "Success",
          ref_url: "/clearance",
          is_read: false,
          metadata: {
            type: "clearance_completion",
            userId,
            totalSigned: records.length,
            completedAt: new Date().toISOString(),
          },
        });
      }
    } else {
      // If student is not all signed (e.g. reopened), delete any obsolete completion notification
      await adminClient
        .from("notifications")
        .delete()
        .eq("user_id", userId)
        .eq("title", "Clearance Completed");
    }
  } catch (err) {
    console.warn("[Student Completion Dispatch] Error syncing completion notification:", err);
  }
}

/**
 * Checks and creates the "Clearance Completed" notification if user just completed all departments.
 */
export async function checkAndDispatchStudentCompletion(
  userId: string,
  adminClient = getSupabaseAdmin()
) {
  return syncStudentCompletionNotification(userId, adminClient);
}

/**
 * Revokes "Clearance Completed" notification for a user when clearance is reopened or reverted.
 */
export async function revokeStudentCompletionNotification(
  userId: string,
  adminClient = getSupabaseAdmin()
) {
  if (!userId) return;
  try {
    await adminClient
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .eq("title", "Clearance Completed");
  } catch (err) {
    console.warn("[Student Completion Dispatch] Error revoking completion notification:", err);
  }
}
