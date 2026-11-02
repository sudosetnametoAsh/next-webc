'use client'

import Link from 'next/link'
import {
  Compass,
  Users,
  FileSpreadsheet,
  Building2,
  BarChart3,
  ArrowUpRight,
} from 'lucide-react'

export default function QuickOperations() {
  const operations = [
    {
      title: 'Clients Directory',
      subtitle: 'Student & Staff Clearance Progress',
      href: '/admin/clients',
      icon: Users,
      actionText: 'View Clients',
    },
    {
      title: 'Clearance Templates',
      subtitle: 'Clerance Workflow Creation',
      href: '/admin/templates',
      icon: FileSpreadsheet,
      actionText: 'Manage Templates',
    },
    {
      title: 'Clearance Departments',
      subtitle: 'Departments & Location',
      href: '/admin/departments',
      icon: Building2,
      actionText: 'Manage Departments',
    },
    {
      title: 'Reports & Analytics',
      subtitle: 'Clearance Statistics',
      href: '/admin/reports',
      icon: BarChart3,
      actionText: 'View Reports',
    },
  ]

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl overflow-hidden flex flex-col h-full">
      {/* ── Card Header ── */}
      <div className="px-6 py-4 border-b border-slate-800 bg-[#070c18] flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Compass className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">
              Quick Actions
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-400 truncate">
            Shortcuts to key administrative tasks and workflow management
          </p>
        </div>
      </div>

      {/* ── 2x2 Operations Grid ── */}
      <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
        {operations.map((op) => {
          const Icon = op.icon
          return (
            <Link
              key={op.title}
              href={op.href}
              className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border border-slate-800/80 bg-[#070c18]/80 hover:bg-slate-800/40 hover:border-slate-700 transition-all cursor-pointer h-full"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                  {op.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {op.subtitle}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-semibold text-slate-400 group-hover:text-slate-200">
                <span>{op.actionText}</span>
                <span className="text-amber-400 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
