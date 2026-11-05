import { NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';
import { getSession } from '@/lib/auth/get-session';

export async function GET() {
  try {
    const { user_id } = await getSession();
    const client = await createClient();
    const { data, error } = await client.rpc('clearance_document_history', { p_user_id: user_id });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Unable to load clearance history' }, { status: 401 });
  }
}
