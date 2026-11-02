'use client'

import {
  Activity,
  CheckCircle2,
  FileCheck,
  Building2,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react'
import type { ActivityItem } from '@/app/api/admin/activity/route'
import { getDepartmentIcon } from '@/lib/department-icons'

interface Props {
  activities?: ActivityItem[]
  isLoading?: boolean
  isRefetching?: boolean
  onRefresh?: () => void
  className?: string
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 0 || diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return 'Recently'
  }
}

export default function RecentActivityFeed({
  activities = [],
  isLoading,
  isRefetching,
  onRefresh,
  className = '',
}: Props) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl overflow-hidden flex flex-col ${className}`}>
      {/* ── Card Header ── */}
      <div className="px-6 py-4 border-b border-slate-800 bg-[#070c18] flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Activity className="h-4 w-4" />
            </span>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Live Activity Feed
              </h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>
          </div>
          <p className="mt-0.5 text-xs text-slate-400 truncate">
            Real-time clearance sign-offs, officer actions, and client milestones
          </p>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefetching}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            title="Refresh activity feed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        )}
      </div>

      {/* ── Activity Feed List ── */}
      <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="space-y-4 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3.5 animate-pulse">
                <div className="h-9 w-9 rounded-xl bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/3 bg-slate-800 rounded" />
                  <div className="h-3 w-1/3 bg-slate-800/60 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
            <Clock className="h-8 w-8 text-slate-600 mb-2 stroke-1" />
            <p className="text-sm font-medium text-slate-400">No clearance events recorded yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Actions taken by department officers or clearance endorsements will stream in live.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-5 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-800/80">
            {activities.map((item) => {
              const DeptIcon = item.iconName
                ? getDepartmentIcon(item.iconName, item.deptName)
                : Building2

              return (
                <div key={item.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div className="absolute -left-6 top-1 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900 group-hover:border-amber-500 group-hover:scale-110 transition-all">
                    {item.type === 'sign' ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <FileCheck className="h-3 w-3 text-amber-400" />
                    )}
                  </div>

                  {/* Content Container */}
                  <div className="rounded-xl border border-slate-800/80 bg-[#070c18]/80 p-3.5 transition-all group-hover:border-slate-700 group-hover:bg-[#070c18]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-100 group-hover:text-white transition-colors truncate">
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>

                      <span className="text-[10px] font-mono text-slate-500 shrink-0 self-start">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>

                    {item.actorName && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span className="text-slate-500">Signatory:</span>
                        <span className="font-semibold text-slate-300 truncate">
                          {item.actorName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
