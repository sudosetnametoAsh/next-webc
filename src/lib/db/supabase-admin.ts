import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Cache singleton instance on globalThis to prevent memory leak across Next.js requests and HMR reloads
const globalForAdmin = globalThis as unknown as {
  supabaseAdmin: SupabaseClient | undefined;
};

/**
 * Service-role admin client for bypassing RLS in server-side operations
 * like inserting notifications, background syncing, and system logs.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (globalForAdmin.supabaseAdmin) {
    return globalForAdmin.supabaseAdmin;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

  const client = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  globalForAdmin.supabaseAdmin = client;
  return client;
}
