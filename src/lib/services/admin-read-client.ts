import { createClient } from '@/lib/db/supabase-server';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';

/** Verify the caller before using privileged, period-filtered admin reads. */
export async function adminReadClient() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  const roles = user?.user_metadata?.custom_claims?.roles;
  return Array.isArray(roles) && roles.includes('Admin') ? getSupabaseAdmin() : null;
}
