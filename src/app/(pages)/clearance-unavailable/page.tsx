import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, Clock3, GraduationCap, LayoutDashboard, LockKeyhole, LogOut, ShieldCheck, TriangleAlert } from 'lucide-react';
import { createClient } from '@/lib/db/supabase-server';
import { APP_TIME_ZONE } from '@/lib/date-time';
import PeriodAccessRefresh from '@/components/clearance/period-access-refresh';
import AzureSignOutButton from '@/components/auth/azure-sign-out-button';

export default async function ClearanceUnavailable() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/');
  const { data, error } = await client.rpc('period_access');
  if (!error && data?.is_open && data?.client_enrolled) redirect('/clearance');
  const roles = user.user_metadata?.custom_claims?.roles;
  const isAdmin = Array.isArray(roles) && roles.includes('Admin');
  const ended = data?.state === 'ended';
  const preparing = !error && !ended && data?.client_enrolled;
  const Icon = error ? TriangleAlert : preparing ? Clock3 : LockKeyhole;
  const title = error ? 'Let’s try that again' : ended ? 'This clearance term has ended' : preparing ? 'Your clearance period is being prepared' : 'You’re not enrolled for this term';
  const description = error ? 'We couldn’t verify your clearance access. Refresh to try again.' : ended ? 'Client access is closed for this term. Contact the administrator about enrollment in the next one.' : preparing ? 'Your enrollment is ready. You’ll be able to view your clearance once the administrator opens the term.' : 'Contact the administrator to confirm your participation in the current clearance period.';
  const opening = preparing && data?.opens_at ? new Date(data.opens_at).toLocaleString('en-PH', { timeZone: APP_TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' }) : null;
  const portalClass = 'group flex items-center gap-3 rounded-xl border border-slate-800 bg-[#070c18] p-4 transition-colors hover:border-amber-400/30 hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-amber-400';

  return <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#070c18] px-5 py-10 text-slate-100 sm:px-8">
    <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[640px] -translate-x-1/2 rounded-full bg-amber-500/[0.04] blur-3xl" />
    <div className="relative w-full max-w-xl">
      <div className="mb-7 flex items-center justify-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500"><GraduationCap className="h-5 w-5 text-amber-400" />STI CLEARANCE PORTAL</div>
      <section aria-labelledby="access-title" className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0a101f] shadow-2xl shadow-black/25">
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300"><Icon className="h-6 w-6" /></span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/70 bg-slate-800/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />{error ? 'Check access' : ended ? 'Term ended' : preparing ? 'Preparing' : 'Enrollment required'}</span>
          </div>
          <h1 id="access-title" className="max-w-md text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{description}</p>
          {opening && <div className="mt-6 flex gap-3 rounded-xl border border-amber-400/15 bg-amber-400/5 p-4"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Scheduled opening</p><p className="mt-1 text-sm font-semibold text-amber-200">{opening}</p><p className="mt-1 text-[11px] text-slate-500">Manila time</p></div></div>}
          {(data?.officer_enrolled || isAdmin) && <div className="mt-6 space-y-2">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Available workspaces</p>
            {data?.officer_enrolled && <Link href="/department/dashboard" className={portalClass}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700/70 bg-slate-800/60 text-amber-300"><ShieldCheck className="h-4 w-4" /></span><span className="flex-1"><span className="block text-xs font-semibold text-slate-200">Department portal</span><span className="mt-0.5 block text-[11px] text-slate-500">Manage tasks and sign clearances</span></span><ArrowUpRight className="h-4 w-4 text-slate-500 transition-colors group-hover:text-amber-300" /></Link>}
            {isAdmin && <Link href="/admin/clients" className={portalClass}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700/70 bg-slate-800/60 text-amber-300"><LayoutDashboard className="h-4 w-4" /></span><span className="flex-1"><span className="block text-xs font-semibold text-slate-200">Admin portal</span><span className="mt-0.5 block text-[11px] text-slate-500">Manage the term and client enrollment</span></span><ArrowUpRight className="h-4 w-4 text-slate-500 transition-colors group-hover:text-amber-300" /></Link>}
          </div>}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 bg-[#070c18] px-6 py-4 sm:px-8">
          <PeriodAccessRefresh />
          <AzureSignOutButton><span className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"><LogOut className="h-3.5 w-3.5" />Sign out</span></AzureSignOutButton>
        </div>
      </section>
      <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">Your account and previous clearance records remain saved.</p>
    </div>
  </main>;
}
