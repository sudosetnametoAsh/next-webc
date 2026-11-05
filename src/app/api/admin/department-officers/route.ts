import { NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';
export async function GET() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  const roles = user?.user_metadata?.custom_claims?.roles;
  if (!Array.isArray(roles) || !roles.includes('Admin')) return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
  const { data, error } = await client.from('current_staffs').select('staff_id,staff_name,users(email)').order('staff_name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: (data || []).map(item => ({ staff_id: item.staff_id, staff_name: item.staff_name, email: (Array.isArray(item.users) ? item.users[0] : item.users)?.email ?? null })) });
}
