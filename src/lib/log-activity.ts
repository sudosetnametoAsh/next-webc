import { createClient } from "@/lib/db/supabase-server"; // Adjust path if needed
import type { SupabaseClient } from "@supabase/supabase-js";

export async function logActivity(
  staffId: string,
  actions: string,
  message: string,
  client?: SupabaseClient
) {
  // We use the server client to safely insert the log
  const supabase = client ?? await createClient();

  const { error } = await supabase
    .from("clearance_logs")
    .insert({
      staff_id: staffId,
      actions: actions,
      message: message,
    });

  if (error) {
    // We log the error, but we don't usually want to crash the main user request
    // just because the activity log failed to write.
    console.error("Failed to write activity log:", error.message);
  }
}
