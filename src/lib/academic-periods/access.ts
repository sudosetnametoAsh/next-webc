export interface PeriodAccess {
  period_id: number | null;
  state: 'preparing' | 'open' | 'ended' | null;
  opens_at: string | null;
  is_open: boolean;
  client_enrolled: boolean;
  officer_enrolled: boolean;
}

export function periodAccessDenial(access: PeriodAccess, area: 'client' | 'department') {
  if (area === 'department') return access.officer_enrolled ? null : 'NOT_PARTICIPATING';
  if (!access.is_open) return 'PERIOD_NOT_OPEN';
  return access.client_enrolled ? null : 'NOT_PARTICIPATING';
}
