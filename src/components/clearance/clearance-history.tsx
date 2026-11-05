'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { academicPeriodLabel } from '@/lib/academic-periods/types';
import type { getStudentProfilePromise } from '@/modules/clearance/application/repository/dashboard-repository';
import { exportClearancePDF } from '@/utils/export-clearance-pdf';

type SavedRecord = {
  clearance_id: number; status: string; signed_at: string | null;
  snapshot: Partial<getStudentProfilePromise> & { department?: string; staff?: string; staff_id?: string; tier?: number };
};
type SavedPeriod = { period_id: number; start_year: number; end_year: number; term: number; is_active: boolean; records: SavedRecord[] };

export default function ClearanceHistory() {
  const [selection, setSelection] = useState('');
  const { data: periods = [], isLoading, error } = useQuery<SavedPeriod[]>({
    queryKey: ['clearance', 'history'],
    queryFn: async () => {
      const response = await fetch('/api/student/clearance-history', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to load clearance history');
      return body.data;
    },
  });
  const archives = periods.filter(period => !period.is_active);
  const selected = archives.find(period => String(period.period_id) === selection);
  const complete = selected && selected.records.length > 0 && selected.records.every(record => record.status === 'Signed');

  const download = () => {
    if (!selected || !complete) return;
    const first = selected.records[0].snapshot;
    try {
      exportClearancePDF({
        studentProfile: { student_id: first.student_id || '', student_name: first.student_name || null, course_name: first.course_name || null, section_number: first.section_number ?? null, year: first.year ?? null, semester: selected.term, academic_year: `${selected.start_year}-${selected.end_year}`, period_id: selected.period_id },
        records: selected.records.map(record => ({ clearance_id: record.clearance_id, department: record.snapshot.department || '', staff: record.snapshot.staff || '', staff_id: record.snapshot.staff_id || '', tier: record.snapshot.tier, status: record.status, signed_at: record.signed_at, task_count: 0, cleared_task: 0, period_id: selected.period_id, academic_year: `${selected.start_year}-${selected.end_year}`, term: selected.term })),
      });
    } catch { toast.error('Unable to download this clearance document.'); }
  };

  return <section className="mt-6 rounded-xl border border-slate-800 bg-[#0a101f] p-4">
    <h2 className="text-sm font-semibold text-white">Previous clearance periods</h2>
    {isLoading ? <p className="mt-2 text-xs text-slate-400">Loading history…</p> : error ? <p role="alert" className="mt-2 text-xs text-rose-400">{error.message}</p> : archives.length === 0 ? <p className="mt-2 text-xs text-slate-400">No previous clearance periods.</p> : <div className="mt-3 flex flex-wrap items-center gap-3">
      <select aria-label="Previous clearance period" value={selection} onChange={event => setSelection(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"><option value="">Select academic period</option>{archives.map(period => <option key={period.period_id} value={period.period_id}>{academicPeriodLabel(period)}</option>)}</select>
      <button onClick={download} disabled={!complete} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-40">Download clearance</button>
      {selected && !complete && <p className="text-xs text-slate-400">This period has incomplete clearance requirements.</p>}
    </div>}
  </section>;
}
