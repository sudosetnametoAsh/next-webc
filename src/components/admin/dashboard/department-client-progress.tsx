'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  Building2,
  MapPin,
  ArrowRight,
} from 'lucide-react'
import type { DepartmentProgressItem } from '@/app/api/admin/pipeline-radar/route'
import { getDepartmentIcon } from '@/lib/department-icons'
import { getProgressBarColor } from '@/utils/formatters'

interface Props {
  departments?: DepartmentProgressItem[]
  isLoading?: boolean
}

export default function DepartmentClientProgress({
  departments = [],
  isLoading,
}: Props) {
  // Sort with most stalled clients on top (bottlenecks first), then lowest rate, taking top 5
  const topDepartments = useMemo(() => {
    return [...departments]
      .sort((a, b) => {
        if (a.totalAssigned === 0 && b.totalAssigned > 0) return 1
        if (b.totalAssigned === 0 && a.totalAssigned > 0) return -1
        if (b.stalledCount !== a.stalledCount) return b.stalledCount - a.stalledCount
        return a.rate - b.rate || b.pendingCount - a.pendingCount
      })
      .slice(0, 5)
  }, [departments])

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="space-y-1.5">
            <div className="h-5 w-48 bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-64 bg-slate-800/60 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-2.5 pt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-slate-800/40 border border-slate-800/60 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl overflow-hidden flex flex-col h-full">
      {/* ── Card Header ── */}
      <div className="px-6 py-4 border-b border-slate-800 bg-[#070c18] flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Building2 className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">
              Clearance Department Progress
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-400 truncate">
            Departments with the highest volume of pending clearance signatures
          </p>
        </div>

        <Link
          href="/admin/departments"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors shrink-0"
        >
          <span>Manage Departments</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── Compact 5-Department List ── */}
      <div className="p-4 sm:p-5 space-y-2.5 flex-1 overflow-y-auto scrollbar-thin">
        {topDepartments.length === 0 ? (
          <div className="text-center py-10">
            <Building2 className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-400">
              No clearance departments configured
            </p>
          </div>
        ) : (
          topDepartments.map((dept, index) => {
            const DeptIcon = getDepartmentIcon(dept.iconName, dept.deptName)
            const hasLocation = Boolean(dept.floor || dept.room)
            const isZeroAssigned = dept.totalAssigned === 0

            return (
              <div
                key={dept.deptId}
                className="rounded-xl border border-slate-800/80 bg-[#070c18]/80 p-3 transition-ui hover:border-slate-700/90 group"
              >
                {/* Upper row: Icon, Dept Name, Location, Numbers */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800/60 text-amber-400 group-hover:border-amber-500/40 group-hover:bg-amber-500/10 transition-colors">
                      <DeptIcon className="h-3.5 w-3.5" />
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          #{index + 1}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                          {dept.deptName}
                        </h4>
                        {dept.isBottleneck ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            BOTTLENECK
                          </span>
                        ) : isZeroAssigned ? (
                          <span className="text-[9px] font-medium px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            Unassigned
                          </span>
                        ) : null}
                      </div>

                      {/* Physical Location Badge */}
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="h-2.5 w-2.5 text-slate-500 shrink-0" />
                        <span className="text-[11px] text-slate-400 truncate">
                          {hasLocation
                            ? `${dept.floor || 'Campus'} · ${dept.room || 'Office'}`
                            : 'Location unconfigured'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right metrics */}
                  <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 font-mono text-xs">
                    {!isZeroAssigned ? (
                      <>
                        <div className="text-right">
                          <span className="text-slate-400 text-xs font-sans">
                            <strong className="text-white font-semibold font-mono">
                              {dept.clearedCount}
                            </strong>
                            /{dept.totalAssigned}
                          </span>
                          {dept.stalledCount > 0 ? (
                            <span className="block text-[10px] font-sans font-bold text-rose-400">
                              {dept.stalledCount} overdue (&gt;24h)
                            </span>
                          ) : dept.pendingCount > 0 ? (
                            <span className="block text-[10px] font-sans font-medium text-amber-400">
                              {dept.pendingCount} pending
                            </span>
                          ) : null}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full font-bold border text-[11px] font-mono transition-colors ${
                            dept.rate === 100
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800/80 text-slate-400 border-slate-700/80'
                          }`}
                        >
                          {dept.rate}%
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500 font-sans">
                        0 clients
                      </span>
                    )}
                  </div>
                </div>

                {/* Compact Progress Bar */}
                {!isZeroAssigned && (
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 mt-2">
                    <div
                      className={`h-full rounded-full w-full origin-left transition-transform duration-200 ease-out motion-reduce:transition-none ${getProgressBarColor(dept.rate)}`}
                      style={{ transform: `scaleX(${(dept.rate) / 100})` }}
                    />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
