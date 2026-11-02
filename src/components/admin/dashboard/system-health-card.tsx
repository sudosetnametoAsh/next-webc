'use client'

import Link from 'next/link'
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  MapPin,
  FileSpreadsheet,
  Users,
  ArrowRight,
} from 'lucide-react'
import type { PipelineRadarData } from '@/app/api/admin/pipeline-radar/route'

interface Props {
  health?: PipelineRadarData['health']
  isLoading?: boolean
}

export default function SystemHealthCard({ health, isLoading }: Props) {
  if (isLoading || !health) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="space-y-1.5">
            <div className="h-5 w-40 bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-56 bg-slate-800/60 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-3 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-800/40 border border-slate-800/60 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const {
    unassignedTemplatesCount,
    uncoveredCoursesCount,
    missingLocationsCount,
    totalDepartments,
    totalCourses,
    uncoveredCourses,
    missingLocationDepartments,
  } = health

  const isHealthy =
    unassignedTemplatesCount === 0 &&
    uncoveredCoursesCount === 0 &&
    missingLocationsCount === 0

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl overflow-hidden flex flex-col">
      {/* ── Card Header ── */}
      <div className="px-6 py-5 border-b border-slate-800 bg-[#070c18] flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                isHealthy
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
              }`}
            >
              {isHealthy ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">
              Configuration Health
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-400 truncate">
            Operational readiness across clearance templates, programs, and office locations
          </p>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${
            isHealthy
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}
        >
          {isHealthy ? 'Optimal Setup' : 'Attention Needed'}
        </span>
      </div>

      {/* ── Status List ── */}
      <div className="p-6 space-y-3.5 flex-1">
        {/* 1. Program Template Coverage */}
        <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-slate-800/80 bg-[#070c18]/60">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <FileSpreadsheet className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">
                  Degree Program Blueprints
                </span>
                {uncoveredCoursesCount === 0 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {uncoveredCoursesCount === 0
                  ? `All ${totalCourses} academic courses have active clearance templates configured.`
                  : `${uncoveredCoursesCount} course(s) lack a clearance template: ${uncoveredCourses.slice(0, 2).join(', ')}${uncoveredCourses.length > 2 ? '...' : ''}`}
              </p>
            </div>
          </div>

          <Link
            href="/admin/templates"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 shrink-0 transition-colors self-center flex items-center gap-1"
          >
            <span>{uncoveredCoursesCount === 0 ? 'Templates' : 'Create'}</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* 2. Signatory Staff Assignment */}
        <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-slate-800/80 bg-[#070c18]/60">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <Users className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">
                  Signatory Personnel Coverage
                </span>
                {unassignedTemplatesCount === 0 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {unassignedTemplatesCount === 0
                  ? 'All participating clearance offices have assigned signatory officers.'
                  : `${unassignedTemplatesCount} template department(s) require designated officers to sign.`}
              </p>
            </div>
          </div>

          <Link
            href="/admin/templates"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 shrink-0 transition-colors self-center flex items-center gap-1"
          >
            <span>{unassignedTemplatesCount === 0 ? 'Inspect' : 'Assign'}</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* 3. Physical Office Locations */}
        <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-slate-800/80 bg-[#070c18]/60">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">
                  Campus Office Directory
                </span>
                {missingLocationsCount === 0 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {missingLocationsCount === 0
                  ? `All ${totalDepartments} clearance offices have floor and room locations published.`
                  : `${missingLocationsCount} office(s) missing room details: ${missingLocationDepartments.slice(0, 2).join(', ')}`}
              </p>
            </div>
          </div>

          <Link
            href="/admin/departments"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 shrink-0 transition-colors self-center flex items-center gap-1"
          >
            <span>{missingLocationsCount === 0 ? 'Directory' : 'Update'}</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
