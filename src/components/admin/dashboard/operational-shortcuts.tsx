'use client'

import Link from 'next/link'
import {
  Compass,
  FileSpreadsheet,
  Building2,
  Users,
  ArrowUpRight,
  Sparkles,
  Clock,
  CheckCircle2,
} from 'lucide-react'

interface Props {
  readyForFinalCount?: number
  phase1PendingCount?: number
}

export default function OperationalShortcuts({
  readyForFinalCount = 0,
  phase1PendingCount = 0,
}: Props) {
  return (
    <div className="rounded-2xl border border-portal-border bg-portal-surface shadow-xl overflow-hidden flex flex-col">
      {/* ── Card Header ── */}
      <div className="px-6 py-5 border-b border-portal-border bg-portal-inset flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Compass className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">
              Operational Command Hub
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-400 truncate">
            Quick administrative action triggers and priority client queues
          </p>
        </div>
      </div>

      {/* ── Actions Grid ── */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
        {/* Shortcut 1: Ready for Final Endorsement */}
        <Link
          href="/admin/clients"
          className="group relative flex flex-col justify-between p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-ui cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {readyForFinalCount} Ready
              </span>
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
              Final Endorsements
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Clients who completed all prerequisites, awaiting Registrar sign-off
            </p>
          </div>

          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
            <span>Inspect Queue</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </Link>

        {/* Shortcut 2: Phase 1 Pending Gate */}
        <Link
          href="/admin/clients"
          className="group relative flex flex-col justify-between p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40 transition-ui cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
              <span className="flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {phase1PendingCount} Pending
              </span>
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
              Prerequisite Gate
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Clients awaiting initial Phase 1 settlement to unlock parallel clearance
            </p>
          </div>

          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-amber-400 group-hover:text-amber-300">
            <span>Filter Clients</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </Link>

        {/* Shortcut 3: Create Template */}
        <Link
          href="/admin/templates"
          className="group relative flex flex-col justify-between p-4 rounded-xl border border-slate-800 bg-[#070c18]/80 hover:bg-slate-800/40 hover:border-slate-700 transition-ui cursor-pointer"
        >
          <div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-300 mb-2">
              <FileSpreadsheet className="h-4 w-4 text-amber-400" />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
              Manage Templates
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Configure tiered signing phases, course assignments, and personnel
            </p>
          </div>

          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-slate-300 group-hover:text-white">
            <span>Open Blueprints</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </Link>

        {/* Shortcut 4: Manage Departments */}
        <Link
          href="/admin/departments"
          className="group relative flex flex-col justify-between p-4 rounded-xl border border-slate-800 bg-[#070c18]/80 hover:bg-slate-800/40 hover:border-slate-700 transition-ui cursor-pointer"
        >
          <div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-300 mb-2">
              <Building2 className="h-4 w-4 text-amber-400" />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
              Clearance Offices
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Register signatory departments, icons, and campus office locations
            </p>
          </div>

          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-slate-300 group-hover:text-white">
            <span>Office Directory</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </Link>
      </div>
    </div>
  )
}
