import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/db/supabase-server';
import { getSupabaseAdmin } from '@/lib/db/supabase-admin';
import { invalidateServerAdminCache } from '@/lib/services/admin-cache';
import { invalidateServerDepartmentCache } from '@/lib/services/department-cache';
import { invalidateServerClearanceCache } from '@/lib/services/clearance-cache';

async function authorize() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const roles = user.user_metadata?.custom_claims?.roles;
  if (!Array.isArray(roles) || !roles.includes('Admin')) return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
  return null;
}
const id = z.string().min(1).max(11);
const configuration = z.object({
  period_id: z.number().int().positive().optional(),
  start_year: z.number().int().min(2000).max(9998), end_year: z.number().int(), term: z.number().int().min(1).max(4),
  opens_at: z.string().datetime({ offset: true }).nullable().default(null),
  source_period_id: z.number().int().positive().nullable().default(null),
  student_ids: z.array(id).max(20000).default([]), staff_ids: z.array(id).max(20000).default([]),
  carry_templates: z.boolean().default(false),
  start: z.boolean().default(false),
}).refine(value => value.end_year === value.start_year + 1, 'Academic year must span consecutive years');
const action = z.object({ action: z.enum(['start', 'end']), period_id: z.number().int().positive() });
function invalidate() { invalidateServerAdminCache(); invalidateServerDepartmentCache(); invalidateServerClearanceCache(); }

export async function GET(req?: NextRequest) {
  const denied = await authorize(); if (denied) return denied;
  const admin = getSupabaseAdmin();
  if (req?.nextUrl.searchParams.get('view') === 'carryover') {
    const { data, error } = await admin.rpc('period_carry_candidates', { p_source_period_id: null });
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  const { data, error } = await admin.from('academic_periods').select('*').order('start_year', { ascending: false }).order('term', { ascending: false });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } });
}
export async function POST(req: NextRequest) {
  const denied = await authorize(); if (denied) return denied;
  let body: unknown; try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const parsed = configuration.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().rpc('save_clearance_period', { p_config: parsed.data });
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'This academic year and term already exist.' : error.message }, { status: 409 });
  invalidate(); return NextResponse.json({ data });
}
export async function PATCH(req: NextRequest) {
  const denied = await authorize(); if (denied) return denied;
  let body: unknown; try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const parsed = action.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid term action' }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().rpc(parsed.data.action === 'start' ? 'start_clearance_period' : 'end_clearance_period', { p_period_id: parsed.data.period_id });
  if (error) {
    console.error('Clearance term action failed', { action: parsed.data.action, period_id: parsed.data.period_id, code: error.code, message: error.message, details: error.details, hint: error.hint });
    return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
  }
  invalidate(); return NextResponse.json({ data });
}
