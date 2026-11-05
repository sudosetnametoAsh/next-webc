'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, CalendarDays, X, Users, ArrowRight, Play, Square, Clock3 } from 'lucide-react';
import { toast } from 'sonner';
import { useAcademicPeriods } from '@/hooks/admin/academic-periods';
import { academicPeriodLabel, effectivePeriodState, type AcademicPeriod, type CarryCandidates, type CarryCandidate, type TermConfiguration } from '@/lib/academic-periods/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import CarryoverSelection from './carryover-selection';
import { Checkbox } from '@/components/ui/checkbox';
import ConfirmationModal from './confirmation-modal';

const inputClass = 'mt-1.5 w-full rounded-lg border border-slate-700 bg-[#070c18] px-3 py-2 text-sm text-slate-100 [color-scheme:dark] focus:border-amber-500/60 focus:outline-hidden focus:ring-1 focus:ring-amber-500/30';
const actionClass = 'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
const emptyCandidates: CarryCandidates = { source_period_id: null, students: [], staff: [], templates: [] };
const ids = (rows: CarryCandidate[]) => rows.map(row => row.id);

export function useTermManagement() {
  const { data: periods = [], isLoading, error } = useAcademicPeriods();
  const current = periods.find(period => period.is_active);
  const currentState = current ? effectivePeriodState(current) : null;
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();
  const openedFromUrl = useRef(false);
  const [open, setOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateError, setCandidateError] = useState('');
  const [candidates, setCandidates] = useState<CarryCandidates>(emptyCandidates);
  const [config, setConfig] = useState<TermConfiguration | null>(null);
  const [newSetup, setNewSetup] = useState(false);
  const [carryStudents, setCarryStudents] = useState(false);
  const [carryStaff, setCarryStaff] = useState(false);
  const [stage, setStage] = useState<'none' | 'select' | 'excluded'>('none');


  async function loadCandidates() {
    setLoadingCandidates(true); setCandidateError('');
    try {
      const response = await fetch('/api/admin/academic-periods?view=carryover', { cache: 'no-store' });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Unable to load carryover roster');
      setCandidates(body.data);
    } catch (err) { setCandidateError(err instanceof Error ? err.message : 'Unable to load carryover roster'); }
    finally { setLoadingCandidates(false); }
  }
  function configure(source?: AcademicPeriod) {
    const existing = source ? undefined : current;
    const ended = source ?? periods.find(period => period.state === 'ended');
    const year = ended ? ended.start_year + (ended.term >= 2 ? 1 : 0) : new Date().getFullYear();
    const term = ended ? ended.term >= 2 ? 1 : ended.term + 1 : 1;
    const draft = existing ?? periods.find(period => !period.is_active && period.state === 'preparing' && period.start_year === year && period.term === term);
    setNewSetup(!existing); setCarryStudents(false); setCarryStaff(false); setCandidateError(''); setCandidates(emptyCandidates);
    setConfig({ period_id: draft?.period_id, start_year: draft?.start_year ?? year, end_year: draft?.end_year ?? year + 1, term: draft?.term ?? term, opens_at: draft?.opens_at ?? null, source_period_id: existing?.source_period_id ?? ended?.period_id ?? null, student_ids: [], staff_ids: [], carry_templates: false });
    setOpen(true);
    if (!existing) void loadCandidates();
  }
  useEffect(() => {
    if (params?.get('manageTerm') === '1' && !isLoading && !openedFromUrl.current) { openedFromUrl.current = true; configure(); }
  // configure uses the current render's loaded period data only when the URL requests it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, isLoading, periods]);

  async function request(method: 'POST' | 'PATCH', body: unknown) {
    const response = await fetch('/api/admin/academic-periods', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await response.json(); if (!response.ok) throw new Error(json.error || 'Unable to update the clearance term');
    void queryClient.invalidateQueries({ queryKey: ['admin'] }, { cancelRefetch: false }); router.refresh(); return json.data as AcademicPeriod;
  }
  async function save(start: boolean) {
    if (!config) return;
    if (newSetup && (loadingCandidates || candidateError)) { toast.error('Load and review the carryover roster before saving.'); return; }
    setBusy(true);
    try {
      const saved = await request('POST', { ...config, source_period_id: newSetup ? candidates.source_period_id : config.source_period_id, student_ids: carryStudents ? config.student_ids : [], staff_ids: carryStaff ? config.staff_ids : [], carry_templates: newSetup && carryStaff && canCopyTemplates && config.carry_templates, start });
      toast.success(start ? effectivePeriodState(saved) === 'open' ? 'Clearance term started. Client access is open.' : 'Term opening scheduled. Enrolled department officers can prepare clearances now.' : 'Configuration saved. Enrolled department officers can prepare clearances before client access opens.');
      setOpen(false); setStage('none');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Unable to save term'); }
    finally { setBusy(false); }
  }
  async function act(action: 'start' | 'end') {
    if (!current) return;
    setBusy(true);
    try {
      const result = await request('PATCH', { action, period_id: current.period_id });
      if (action === 'end') {
        await queryClient.cancelQueries({ queryKey: ['notifications'] });
        queryClient.setQueriesData({ queryKey: ['notifications'] }, []);
        toast.success('Term ended. Notifications cleared; clearance history preserved.'); setConfirmEnd(false); configure(result);
      } else toast.success(effectivePeriodState(result) === 'open' ? 'Term started. Client access is open.' : 'Opening scheduled. Clients remain restricted until the configured time.');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Unable to update term'); }
    finally { setBusy(false); }
  }
  const missingOfficers = config ? candidates.staff.filter(officer => candidates.templates.some(template => template.staff_id === officer.id) && !config.staff_ids.includes(officer.id)) : [];
  const canCopyTemplates = carryStaff && !missingOfficers.length && candidates.templates.every(template => config?.staff_ids.includes(template.staff_id));
  const readOnly = !!current && !newSetup && currentState === 'open';
  const toolbar = <div className="inline-flex w-fit shrink-0 overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-xs font-bold tracking-wide text-slate-950 shadow-lg shadow-amber-500/20 transition-ui hover:from-amber-400 hover:to-amber-500 hover:scale-[1.02] active:scale-[0.98]">
    <button type="button" onClick={() => configure()} disabled={busy || isLoading || !!error} className="flex cursor-pointer items-center gap-2 px-4 py-2.5 disabled:opacity-40"><CalendarDays className="h-4 w-4" />Manage A.Y. - Term</button>
    {current && <DropdownMenu>
      <DropdownMenuTrigger asChild><button type="button" aria-label="Term actions" disabled={busy} className="group/term cursor-pointer border-l border-amber-700/30 px-2.5 outline-hidden transition-colors hover:bg-amber-700/10 focus-visible:bg-amber-700/15 data-[state=open]:bg-amber-700/15 disabled:opacity-40"><ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/term:rotate-180" /></button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 rounded-2xl border-slate-800 bg-[#0a101f] p-1.5 text-slate-200 shadow-2xl shadow-black/40">
        <div className="mb-1.5 rounded-xl border border-slate-800/80 bg-[#070c18] px-3.5 py-3">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500"><CalendarDays className="h-3.5 w-3.5 text-amber-400" />Current clearance term</div>
          <p className="text-sm font-semibold tracking-tight text-slate-100">{academicPeriodLabel(current)}</p>
          <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${currentState === 'open' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-amber-400/20 bg-amber-400/10 text-amber-300'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{currentState === 'open' ? 'Open' : current.start_requested_at ? 'Scheduled' : 'Preparing'}</span>
        </div>
        {currentState === 'open' ? <DropdownMenuItem onClick={() => setConfirmEnd(true)} className="cursor-pointer gap-3 rounded-xl px-3 py-3 text-rose-300 focus:bg-rose-500/10 focus:text-rose-200"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-400/15 bg-rose-400/10"><Square className="h-4 w-4 text-rose-300" /></span><span><span className="block text-xs font-semibold">End Term</span><span className="mt-0.5 block text-[11px] font-normal text-slate-500">Close access and prepare the next term</span></span></DropdownMenuItem>
          : current.start_requested_at ? <DropdownMenuItem disabled className="gap-3 rounded-xl px-3 py-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/15 bg-amber-400/10"><Clock3 className="h-4 w-4 text-amber-300" /></span><span><span className="block text-xs font-semibold text-slate-200">Opening scheduled</span><span className="mt-0.5 block text-[11px] font-normal text-slate-500">Waiting for the configured opening time</span></span></DropdownMenuItem>
          : <DropdownMenuItem onClick={() => void act('start')} className="cursor-pointer gap-3 rounded-xl px-3 py-3 text-amber-300 focus:bg-amber-400/10 focus:text-amber-200"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-400/10"><Play className="h-4 w-4 text-amber-300" /></span><span><span className="block text-xs font-semibold">Start Term</span><span className="mt-0.5 block text-[11px] font-normal text-slate-500">Open clearance access for enrolled clients</span></span></DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>}

  </div>;
  const modal = <>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent showCloseButton={false} className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-2xl border-slate-800 bg-[#0a101f] p-0 text-slate-100 shadow-2xl sm:max-w-2xl">
        <div className="shrink-0 border-b border-slate-800 px-5 py-5 sm:px-6">
          <DialogHeader className="relative text-left">
            <div className="flex items-center gap-3 pr-8">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300"><CalendarDays className="h-5 w-5" /></span>
              <div><DialogTitle className="text-lg font-semibold tracking-tight">Manage A.Y. - Term</DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-relaxed text-slate-400">{readOnly ? 'End this term before preparing the next one.' : 'Configure the academic year, term and participants.'}</DialogDescription></div>
            </div>
            <button type="button" aria-label="Close term settings" disabled={busy} onClick={() => setOpen(false)} className="absolute right-0 top-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
          </DialogHeader>
        </div>
        {config && <>
          <form id="term-management-form" onSubmit={event => { event.preventDefault(); void save(false); }} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            <fieldset disabled={readOnly || busy} className="grid gap-4 rounded-xl border border-slate-800 bg-[#070c18] p-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-300">Academic year<input required type="number" min={2000} max={9998} value={config.start_year} onChange={event => setConfig({ ...config, start_year: Number(event.target.value), end_year: Number(event.target.value) + 1 })} className={inputClass} /><span className="mt-1.5 block text-[11px] text-slate-500">A.Y. {config.start_year}–{config.end_year}</span></label>
              <label className="text-xs font-medium text-slate-300">Term<select value={config.term} onChange={event => setConfig({ ...config, term: Number(event.target.value) })} className={inputClass}>{[1,2,3,4].map(value => <option key={value} value={value}>Term {value}</option>)}</select></label>
            </fieldset>
            {newSetup && <fieldset disabled={busy || loadingCandidates || !!candidateError} className="space-y-4 rounded-xl border border-slate-800 bg-[#070c18] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Users className="h-3.5 w-3.5 text-amber-400" />Carryover</div>
              {loadingCandidates && <p className="text-xs text-slate-400">Loading the previous roster…</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/30 p-3 text-xs font-medium text-slate-300"><Checkbox checked={carryStudents} onCheckedChange={checked => { setCarryStudents(checked === true); setConfig({ ...config, student_ids: checked === true ? ids(candidates.students) : [] }); }} className="border-slate-700 data-[state=checked]:border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:text-slate-950" />Carry over students</label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/30 p-3 text-xs font-medium text-slate-300"><Checkbox checked={carryStaff} onCheckedChange={checked => { setCarryStaff(checked === true); setConfig({ ...config, staff_ids: checked === true ? ids(candidates.staff) : [], carry_templates: false }); }} className="border-slate-700 data-[state=checked]:border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:text-slate-950" />Carry over staff</label>
              </div>
              <button type="button" onClick={() => { setOpen(false); setStage('select'); }} className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 px-3 py-3 text-left text-xs font-semibold text-slate-200 transition-colors hover:border-amber-500/50 hover:bg-slate-800/50"><span>Select students / staff to carry over<span className="mt-1 block text-[11px] font-normal text-slate-500">{config.student_ids.length} students · {config.staff_ids.length} staff selected</span></span><ArrowRight className="h-4 w-4 shrink-0 text-amber-400" /></button>
              {carryStaff && <div className="space-y-2 border-t border-slate-800 pt-4"><label className={`flex items-center gap-3 text-xs font-medium ${canCopyTemplates ? 'text-slate-300' : 'text-slate-500'}`}><Checkbox checked={canCopyTemplates && config.carry_templates} disabled={!canCopyTemplates} onCheckedChange={checked => setConfig({ ...config, carry_templates: checked === true })} className="border-slate-700 data-[state=checked]:border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:text-slate-950" />Carry over templates</label>{!canCopyTemplates && <p className="text-[11px] text-amber-300">Select every assigned signatory first.{missingOfficers.length > 0 && ` Missing: ${missingOfficers.map(officer => officer.name).join(', ')}.`}</p>}</div>}
            </fieldset>}
            {candidateError && <p role="alert" className="text-xs text-rose-300">{candidateError} <button type="button" onClick={() => void loadCandidates()} className="underline">Retry</button></p>}
          </form>
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-800 bg-[#070c18] px-5 py-4 sm:px-6"><button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">Cancel</button>{!readOnly && <><button type="submit" form="term-management-form" disabled={busy || loadingCandidates || !!candidateError} className="rounded-lg border border-slate-700 px-5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50">Save</button><button type="button" onClick={() => { const form = document.getElementById('term-management-form') as HTMLFormElement | null; if (form?.reportValidity()) void save(true); }} disabled={busy || loadingCandidates || !!candidateError} className={actionClass}>{busy ? 'Saving…' : 'Start'}</button></>}</div>
        </>}
      </DialogContent>
    </Dialog>
    <ConfirmationModal isOpen={confirmEnd} onClose={() => { if (!busy) setConfirmEnd(false); }} onConfirm={() => act('end')} isLoading={busy} variant="destructive" title="End the current term?" description="Client access will close and all notifications will be cleared. User accounts, enrollments, approvals and submissions are preserved. You can then configure the next term; cancelling that configuration will not reopen this term." confirmLabel="End Term" />
  </>;

  const selectionPage = stage === 'none' || !config ? null : <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="mb-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{stage === 'select' ? 'Select clients to carry over' : 'Clients not carried over'}</h1><p className="text-sm text-slate-400">{stage === 'select' ? 'Choose the students and staff for the next term.' : 'Review the clients excluded from the next term.'}</p></div><div className="flex gap-2"><button onClick={() => { if (stage === 'excluded') setStage('select'); else { setStage('none'); setOpen(true); } }} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800">Back</button><button onClick={() => { if (stage === 'select') setStage('excluded'); else { setStage('none'); setOpen(true); } }} className={actionClass}>{stage === 'select' ? 'Next' : 'Save'}</button></div></div>
    <CarryoverSelection key={stage} candidates={candidates} studentIds={config.student_ids} staffIds={config.staff_ids} excluded={stage === 'excluded'} onSelectionChange={(studentIds, staffIds) => { setConfig({ ...config, student_ids: studentIds, staff_ids: staffIds, carry_templates: false }); setCarryStudents(studentIds.length > 0); setCarryStaff(staffIds.length > 0); }} />
    {modal}
  </div>;
  return { toolbar, modal, selectionPage, error, periodId: current?.period_id };
}
