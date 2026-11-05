'use client';

import { useAcademicPeriods } from '@/hooks/admin/academic-periods';
import { academicPeriodLabel, effectivePeriodState } from '@/lib/academic-periods/types';

export default function AcademicPeriodNotice() {
  const { data: periods, isLoading, error } = useAcademicPeriods();
  const active = periods?.find(period => period.is_active);
  return <p role="status" className="text-xs text-amber-200">
    {active ? `Academic period: ${academicPeriodLabel(active)} · ${effectivePeriodState(active) === 'open' ? 'Open' : 'Preparing — client access closed'}` : isLoading ? 'Loading academic period…' : error ? 'Academic period unavailable. Check period settings before saving.' : 'No active academic period. Use Manage A.Y. - Term before saving.'}
  </p>;
}
