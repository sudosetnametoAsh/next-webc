export type TimedClearance = {
  status: string;
  tier?: number;
  created_at?: string | null;
  signed_at?: string | null;
};

// Waiting starts only when the office exists and all prerequisite offices have signed.
export function clearanceWaitHours(
  record: TimedClearance,
  records: TimedClearance[],
  isStaff = false,
  now = Date.now(),
): number | null {
  if (record.status === 'Signed') return null;
  const lower = isStaff ? [] : records.filter(r => (r.tier ?? 1) < (record.tier ?? 1));
  if (lower.some(r => r.status !== 'Signed')) return null;
  const timestamp = (value?: string | null) => {
    const parsed = value ? Date.parse(value) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  };
  const created = timestamp(record.created_at) ?? now;
  const entry = Math.max(created, ...lower.map(r => timestamp(r.signed_at) ?? created));
  return Math.max(0, (now - entry) / 3600000);
}

export function isClearanceOverdue(record: TimedClearance, records: TimedClearance[], isStaff = false, now = Date.now()) {
  const hours = clearanceWaitHours(record, records, isStaff, now);
  return hours !== null && hours >= 24;
}
