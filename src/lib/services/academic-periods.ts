import type { SupabaseClient } from '@supabase/supabase-js';
import type { AcademicPeriod } from '@/lib/academic-periods/types';

export async function requireActiveAcademicPeriod(client: SupabaseClient): Promise<AcademicPeriod> {
  const { data, error } = await client.from('academic_periods').select('*').eq('is_active', true).single();
  if (error || !data) throw new Error('No working academic period. Use Manage A.Y. - Term to save a preparing period before enrolling clients.');
  return data as AcademicPeriod;
}
