import { createClient } from "@/lib/db/supabase-server"; // Adjust path if needed

export async function logActivity(
  staffId: string,
  actions: string,
  message: string
) {
  // We use the server client to safely insert the log
  const supabase = await createClient();
  console.log("executed")

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
