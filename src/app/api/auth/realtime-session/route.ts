import { NextResponse } from 'next/server';
import { decodeJwt } from 'jose';
import { createClient } from '@/lib/db/supabase-server';

// Return only this request's verified Supabase access token, never refresh/service tokens.
export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' };
  try {
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session?.access_token) return NextResponse.json({ error: 'Session unavailable' }, { status: 401, headers });
    const claims = decodeJwt(session.access_token);
    if (claims.sub !== user.id || claims.role !== 'authenticated' || !claims.exp || claims.exp <= Date.now() / 1000) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401, headers });
    }
    return NextResponse.json({ accessToken: session.access_token }, { headers });
  } catch {
    return NextResponse.json({ error: 'Unable to verify realtime session' }, { status: 503, headers });
  }
}
