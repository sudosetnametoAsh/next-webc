'use client'

import Link from 'next/link'
import {
  GitCommit,
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react'
import type { PipelineRadarData } from '@/app/api/admin/pipeline-radar/route'
import { getDepartmentIcon } from '@/lib/department-icons'
import { getProgressBarColor } from '@/utils/formatters'

interface Props {
  data?: PipelineRadarData
  isLoading?: boolean
  activeFilter?: string
  onFilterChange?: (filter: string) => void
  className?: string
}

export default function PhasePipelineRadar({
  data,
  isLoading,
  activeFilter = 'all',
  onFilterChange,
  className = '',
}: Props) {
  if (isLoading || !data) {
    return (
      <div className={`rounded-2xl border border-slate-800 bg-[#0a101f] p-6 shadow-xl space-y-4 h-[600px] flex flex-col justify-between ${className}`}>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="space-y-1.5">
            <div className="h-5 w-40 bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-64 bg-slate-800/60 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-3 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-800/40 border border-slate-800/60 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const {
    availableFilters = [],
    isStaffOnly,
    staffSummary,
    specificPhases,
    phase1,
    phase2,
    phase3,
  } = data

  // Degree program courses and staff only (exclude 'all')
  const radarFilters = availableFilters.filter((f) => f.id !== 'all')
  const currentFilterObj = availableFilters.find((f) => f.id === activeFilter)
  const courseCodeOrName = currentFilterObj?.label || currentFilterObj?.code || ''

  return (
    <div className={`rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl overflow-hidden flex flex-col h-[600px] ${className}`}>
      {/* ── Card Header ── */}
      <div className="px-6 py-5 border-b border-slate-800 bg-[#070c18] flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <GitCommit className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">
              Clearance Progress
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-400 truncate">
            {specificPhases && specificPhases.length > 0
              ? `Exact phase pipeline configured for ${activeFilter === 'staff' ? 'Staff' : courseCodeOrName || 'selected academic program'}`
              : isStaffOnly
              ? 'Employee clearance operations · Parallel non-sequential verification'
              : 'Normalized clearance velocity across degree programs and prerequisite tiers'}
          </p>
        </div>
      </div>

      {/* ── Program / Template Filter Pills ── */}
      {radarFilters.length > 1 && onFilterChange && (
        <div className="flex items-center gap-1.5 overflow-x-auto px-6 py-2.5 border-b border-slate-800/80 bg-[#070c18]/50 scrollbar-none shrink-0">
          {radarFilters.map((f) => {
            const isActive = activeFilter === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilterChange(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`ml-1.5 text-[10px] font-mono ${
                    isActive ? 'text-slate-950/80 font-bold' : 'text-slate-500'
                  }`}
                >
                  ({f.count})
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Pipeline Body (Scrollable If Exceeds Height) ── */}
      <div className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {/* VIEW 1: SPECIFIC DEGREE PROGRAM OR STAFF SELECTED (Exact Phased Pipeline) */}
        {specificPhases && specificPhases.length > 0 ? (
          <div className="space-y-4">
            {specificPhases.map((phase, idx) => {
              const isFirst = idx === 0
              const isLast = idx === specificPhases.length - 1
              const isStaff = isStaffOnly || activeFilter === 'staff'
              const hasSpecificCourse = !isStaff && Boolean(courseCodeOrName && courseCodeOrName !== 'All Courses')
              const overdueRedirectUrl = isStaff
                ? `/admin/clients?type=staff&status=overdue&phase=${phase.tier}`
                : `/admin/clients?type=students&status=overdue${
                    hasSpecificCourse ? `&course=${encodeURIComponent(courseCodeOrName)}` : ''
                  }&phase=${phase.tier}`

              return (
                <div
                  key={phase.tier}
                  className="relative rounded-xl border border-slate-800/80 bg-[#070c18]/80 p-4 transition-all hover:border-slate-700"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md font-mono text-[11px] font-bold border border-amber-500/30 bg-amber-500/20 text-amber-400">
                        P{phase.tier}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          {phase.title}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {isFirst
                            ? 'Initial prerequisite clearance gate'
                            : isLast
                            ? 'Final institutional verification & certificate release'
                            : 'Parallel department verification'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
                      <span className="text-slate-400">
                        <strong className="text-white font-semibold">{phase.clearedCount}</strong>/{phase.totalAssigned} cleared
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold border text-[11px] ${
                          phase.rate === 100
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-slate-800 bg-slate-800/60 text-slate-400'
                        }`}
                      >
                        {phase.rate}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${getProgressBarColor(phase.rate)}`}
                      style={{ width: `${phase.rate}%` }}
                    />
                  </div>

                  {/* Departments within this phase */}
                  {phase.departments.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 flex-wrap pt-1">
                      {phase.departments.map((dept) => {
                        const DeptIcon = getDepartmentIcon(dept.iconName, dept.deptName)
                        const isBottleneck = dept.isBottleneck
                        const isStalled = dept.stalledCount > 0
                        const chipClass = `inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border font-mono transition-all ${
                          isBottleneck
                            ? 'border-rose-900/60 bg-rose-950/40 text-rose-300 ring-1 ring-rose-500/20'
                            : isStalled
                            ? 'border-rose-900/40 bg-rose-950/20 text-rose-300'
                            : 'border-slate-800 bg-slate-900/70 text-slate-300'
                        } ${isStalled || isBottleneck ? 'hover:bg-rose-900/50 hover:border-rose-700 cursor-pointer' : ''}`

                        if (isStalled || isBottleneck) {
                          return (
                            <Link
                              key={dept.deptId}
                              href={
                                isStaff
                                  ? `/admin/clients?type=staff&status=overdue&phase=${phase.tier}&department=${encodeURIComponent(dept.deptName)}`
                                  : `/admin/clients?type=students&status=overdue${
                                      hasSpecificCourse ? `&course=${encodeURIComponent(courseCodeOrName)}` : ''
                                    }&phase=${phase.tier}&department=${encodeURIComponent(dept.deptName)}`
                              }
                              className={chipClass}
                              title={`${dept.deptName}: ${dept.clearedCount}/${dept.totalAssigned} signed · ${dept.stalledCount} waiting >24h (avg wait: ${dept.avgWaitHours}h)`}
                            >
                              <DeptIcon className="h-3 w-3 text-slate-400" />
                              <span className="font-sans font-medium">{dept.deptName}</span>
                              <span className="font-bold text-slate-200">{dept.rate}%</span>
                              <span className="text-[10px] text-rose-400/90 font-bold">
                                ({dept.stalledCount} &gt;24h)
                              </span>
                            </Link>
                          )
                        }

                        return (
                          <span
                            key={dept.deptId}
                            className={chipClass}
                            title={`${dept.deptName}: ${dept.clearedCount}/${dept.totalAssigned} signed · ${dept.stalledCount} waiting >24h (avg wait: ${dept.avgWaitHours}h)`}
                          >
                            <DeptIcon className="h-3 w-3 text-slate-400" />
                            <span className="font-sans font-medium">{dept.deptName}</span>
                            <span className="font-bold text-slate-200">{dept.rate}%</span>
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Bottleneck Warning Callout */}
                  {(phase.isBottleneck || phase.stalledCount > 0) && (
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-[11px] text-rose-200">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                        <span className="truncate">
                          <strong className="text-rose-300">
                            {phase.isBottleneck ? `Phase ${phase.tier} Bottleneck` : `Phase ${phase.tier} Overdue Queue`} ({phase.stalledCount} overdue &gt;24h):
                          </strong>{' '}
                          {phase.bottleneckDept ? (
                            <>
                              Primary blocker is <strong className="text-white">{phase.bottleneckDept.deptName}</strong> ({phase.bottleneckDept.stalledCount} stalled, avg wait: {phase.bottleneckDept.avgWaitHours}h).
                            </>
                          ) : (
                            'Clients stalled beyond the 24h clearance threshold.'
                          )}
                        </span>
                      </div>
                      <Link
                        href={overdueRedirectUrl}
                        className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-bold shrink-0 transition-colors hover:underline cursor-pointer"
                      >
                        <span>View Overdue Clients &rarr;</span>
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : isStaffOnly && staffSummary ? (
          /* VIEW 2: STAFF ONLY FALLBACK (Parallel Signatories) */
          <div className="space-y-4">
            <div className="relative rounded-xl border border-slate-800/80 bg-[#070c18]/80 p-4 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md font-mono text-[11px] font-bold border border-amber-500/30 bg-amber-500/20 text-amber-400">
                    <Briefcase className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Staff Clearance Operations
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Exempt from sequential prerequisites · All offices sign concurrently
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
                  <span className="text-slate-400">
                    <strong className="text-white font-semibold">{staffSummary.clearedCount}</strong>/{staffSummary.totalAssigned} cleared
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold border text-[11px] ${
                      staffSummary.rate === 100
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-800 bg-slate-800/60 text-slate-400'
                    }`}
                  >
                    {staffSummary.rate}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getProgressBarColor(staffSummary.rate)}`}
                  style={{ width: `${staffSummary.rate}%` }}
                />
              </div>

              {/* Bottleneck Warning */}
              {staffSummary.bottleneckDept && (
                <div className="mt-3 flex items-center justify-between gap-2 p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/50 text-[11px] text-rose-300">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                    <span className="truncate">
                      <strong>Slowest Office:</strong> {staffSummary.bottleneckDept.deptName} is at {staffSummary.bottleneckDept.rate}% signed ({staffSummary.bottleneckDept.pendingCount} pending, {staffSummary.bottleneckDept.stalledCount} waiting &gt;24h)
                    </span>
                  </div>
                  <Link
                    href={`/admin/clients?type=staff&status=overdue&department=${encodeURIComponent(staffSummary.bottleneckDept.deptName)}`}
                    className="text-rose-400 hover:text-rose-300 font-bold shrink-0 transition-colors hover:underline"
                  >
                    Staff Queue &rarr;
                  </Link>
                </div>
              )}

              {/* Participating Offices */}
              {staffSummary.departments.length > 0 && (
                <div className="mt-3 flex items-center gap-1.5 flex-wrap pt-1">
                  {staffSummary.departments.map((dept) => {
                    const DeptIcon = getDepartmentIcon(dept.iconName, dept.deptName)
                    const isBottleneck = dept.isBottleneck
                    const isStalled = dept.stalledCount > 0
                    const isLow = dept.rate < 40 || isBottleneck
                    const chipClass = `inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border font-mono transition-all ${
                      isBottleneck
                        ? 'border-rose-900/60 bg-rose-950/40 text-rose-300 ring-1 ring-rose-500/20'
                        : isStalled || isLow
                        ? 'border-rose-900/40 bg-rose-950/20 text-rose-300'
                        : 'border-slate-800 bg-slate-900/70 text-slate-300'
                    } ${isStalled || isBottleneck ? 'hover:bg-rose-900/50 hover:border-rose-700 cursor-pointer' : ''}`

                    if (isStalled || isBottleneck) {
                      return (
                        <Link
                          key={dept.deptId}
                          href={`/admin/clients?type=staff&status=overdue&department=${encodeURIComponent(dept.deptName)}`}
                          className={chipClass}
                          title={`${dept.deptName}: ${dept.clearedCount}/${dept.totalAssigned} signed · ${dept.stalledCount} waiting >24h (avg wait: ${dept.avgWaitHours}h)`}
                        >
                          <DeptIcon className="h-3 w-3 text-slate-400" />
                          <span className="font-sans font-medium">{dept.deptName}</span>
                          <span className={`font-bold ${isLow ? 'text-rose-400' : 'text-slate-200'}`}>
                            {dept.rate}%
                          </span>
                          <span className="text-[10px] text-rose-400/90 font-bold">
                            ({dept.stalledCount} &gt;24h)
                          </span>
                        </Link>
                      )
                    }

                    return (
                      <span
                        key={dept.deptId}
                        className={chipClass}
                        title={`${dept.deptName}: ${dept.clearedCount}/${dept.totalAssigned} signed · ${dept.stalledCount} waiting >24h (avg wait: ${dept.avgWaitHours}h)`}
                      >
                        <DeptIcon className="h-3 w-3 text-slate-400" />
                        <span className="font-sans font-medium">{dept.deptName}</span>
                        <span className={`font-bold ${isLow ? 'text-rose-400' : 'text-slate-200'}`}>
                          {dept.rate}%
                        </span>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* VIEW 3: NORMALIZED LIFECYCLE (All Degree Programs) */
          <div className="space-y-4">
            {/* Stage 1: Prerequisite Settlement Gate */}
            <div className="relative rounded-xl border border-slate-800/80 bg-[#070c18]/80 p-4 transition-all hover:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/20 text-amber-400 font-mono text-[11px] font-bold border border-amber-500/30">
                    P1
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Prerequisites Gate <span className="text-slate-400 font-normal">· Financial Accounts</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Initial mandatory settlement required across all programs to unlock subsequent phases
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
                  <span className="text-slate-400">
                    <strong className="text-white font-semibold">{phase1.clearedCount}</strong>/{phase1.totalAssigned} cleared
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold border text-[11px] ${
                      phase1.rate === 100
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-800 bg-slate-800/60 text-slate-400'
                    }`}
                  >
                    {phase1.rate}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getProgressBarColor(phase1.rate)}`}
                  style={{ width: `${phase1.rate}%` }}
                />
              </div>

              {phase1.pendingCount > 0 && (
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5 text-amber-400/90 font-medium">
                    <Clock className="h-3 w-3" />
                    {phase1.pendingCount} students held at Phase 1 gate
                    {phase1.stalledCount > 0 && ` (${phase1.stalledCount} waiting >24h, avg ${phase1.avgWaitHours}h)`}
                  </span>
                  <Link
                    href="/admin/clients?type=students&status=overdue&phase=1"
                    className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                  >
                    Inspect &rarr;
                  </Link>
                </div>
              )}
            </div>

            {/* Stage 2: In-Flight Parallel Verification */}
            <div className="relative rounded-xl border border-slate-800/80 bg-[#070c18]/80 p-4 transition-all hover:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md font-mono text-[11px] font-bold border border-amber-500/30 bg-amber-500/20 text-amber-400">
                    P2
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Parallel Clearance Offices
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Non-sequential intermediate verifications across academic & service offices
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
                  <span className="text-slate-400">
                    <strong className="text-white font-semibold">{phase2.clearedCount}</strong>/{phase2.totalAssigned} cleared
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold border text-[11px] ${
                      phase2.rate === 100
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-800 bg-slate-800/60 text-slate-400'
                    }`}
                  >
                    {phase2.rate}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getProgressBarColor(phase2.rate)}`}
                  style={{ width: `${phase2.rate}%` }}
                />
              </div>

              {/* Bottleneck Callout */}
              <div className="mt-3 space-y-2">
                {(phase2.isBottleneck || phase2.stalledCount > 0) && phase2.bottleneckDept ? (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-[11px] text-rose-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                      <span className="truncate">
                        <strong className="text-rose-300">Phase 2 Bottleneck ({phase2.stalledCount} clients &gt;24h):</strong> Primary blocker is{' '}
                        <strong className="text-white">{phase2.bottleneckDept.deptName}</strong> with {phase2.bottleneckDept.stalledCount} clients stalled past 24 hrs (avg wait: {phase2.bottleneckDept.avgWaitHours}h).
                      </span>
                    </div>
                    <Link
                      href={`/admin/clients?type=students&status=overdue&phase=2&department=${encodeURIComponent(phase2.bottleneckDept.deptName)}`}
                      className="text-rose-400 hover:text-rose-300 font-bold shrink-0 transition-colors hover:underline"
                    >
                      Filter &rarr;
                    </Link>
                  </div>
                ) : phase2.bottleneckDept ? (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">
                        <strong>Pacing Office:</strong> {phase2.bottleneckDept.deptName} is at {phase2.bottleneckDept.rate}% ({phase2.bottleneckDept.pendingCount} pending, {phase2.bottleneckDept.stalledCount} &gt;24h)
                      </span>
                    </div>
                    <Link
                      href={`/admin/clients?department=${encodeURIComponent(phase2.bottleneckDept.deptName)}`}
                      className="text-slate-400 hover:text-slate-200 font-semibold shrink-0 transition-colors"
                    >
                      Filter &rarr;
                    </Link>
                  </div>
                ) : null}

                {/* Intermediate Department Chips */}
                {phase2.departments.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {phase2.departments.map((dept) => {
                      const DeptIcon = getDepartmentIcon(dept.iconName, dept.deptName)
                      const isBottleneck = dept.isBottleneck
                      const isStalled = dept.stalledCount > 0
                      const chipClass = `inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border font-mono transition-all ${
                        isBottleneck
                          ? 'border-rose-900/60 bg-rose-950/40 text-rose-300 ring-1 ring-rose-500/20'
                          : isStalled
                          ? 'border-rose-900/40 bg-rose-950/20 text-rose-300'
                          : 'border-slate-800 bg-slate-900/70 text-slate-300'
                      } ${isStalled || isBottleneck ? 'hover:bg-rose-900/50 hover:border-rose-700 cursor-pointer' : ''}`

                      if (isStalled || isBottleneck) {
                        return (
                          <Link
                            key={dept.deptId}
                            href={`/admin/clients?type=students&status=overdue&phase=2&department=${encodeURIComponent(dept.deptName)}`}
                            className={chipClass}
                            title={`${dept.deptName}: ${dept.clearedCount}/${dept.totalAssigned} signed · ${dept.stalledCount} waiting >24h (avg wait: ${dept.avgWaitHours}h)`}
                          >
                            <DeptIcon className="h-3 w-3 text-slate-400" />
                            <span className="font-sans font-medium">{dept.deptName}</span>
                            <span className={`font-bold ${isBottleneck ? 'text-rose-400' : 'text-slate-200'}`}>
                              {dept.rate}%
                            </span>
                            <span className="text-[10px] text-rose-400/90 font-bold">
                              ({dept.stalledCount} &gt;24h)
                            </span>
                          </Link>
                        )
                      }

                      return (
                        <span
                          key={dept.deptId}
                          className={chipClass}
                          title={`${dept.deptName}: ${dept.clearedCount}/${dept.totalAssigned} signed · ${dept.stalledCount} waiting >24h (avg wait: ${dept.avgWaitHours}h)`}
                        >
                          <DeptIcon className="h-3 w-3 text-slate-400" />
                          <span className="font-sans font-medium">{dept.deptName}</span>
                          <span className={`font-bold ${isBottleneck ? 'text-rose-400' : 'text-slate-200'}`}>
                            {dept.rate}%
                          </span>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Stage 3: Terminal Endorsement */}
            <div className="relative rounded-xl border border-slate-800/80 bg-[#070c18]/80 p-4 transition-all hover:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md font-mono text-[11px] font-bold border border-amber-500/30 bg-amber-500/20 text-amber-400">
                    P3
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Terminal Endorsement <span className="text-slate-400 font-normal">· Final Signatory Gate</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Unlocks only when all preceding program-specific prerequisites are completed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
                  <span className="text-slate-400">
                    <strong className="text-white font-semibold">{phase3.clearedCount}</strong>/{phase3.totalAssigned} completed
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold border text-[11px] ${
                      phase3.rate === 100
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-800 bg-slate-800/60 text-slate-400'
                    }`}
                  >
                    {phase3.rate}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getProgressBarColor(phase3.rate)}`}
                  style={{ width: `${phase3.rate}%` }}
                />
              </div>

              {/* Ready to sign banner */}
              <div className="mt-3 flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/25 border border-emerald-900/40 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-300">
                    <strong>{phase3.readyCount} students</strong> completed all prerequisites and are ready for final sign-off!
                    {phase3.stalledCount > 0 && ` (${phase3.stalledCount} waiting >24h)`}
                  </span>
                </div>
                <Link
                  href="/admin/clients?type=students&status=cleared"
                  className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors shrink-0 ml-2 hover:underline"
                >
                  Final Queue &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
