'use client'

import React, { useEffect, useMemo } from 'react'
import {
  X,
  GraduationCap,
  Briefcase,
  MapPin,
  Calendar,
} from 'lucide-react'
import { shrinkCourseName, getProgressBarColor } from '@/utils/formatters'
import { getDepartmentIcon } from '@/lib/department-icons'

// ———— TYPES ————————————————————————————————————————————————————————————————————————————————————————————————

export interface DepartmentClearanceProgress {
  clearance_id?: number
  dept_id?: number
  dept_name: string
  icon_name?: string | null
  tier?: number
  status: 'Incomplete' | 'Pending' | 'Signed'
  created_at?: string | null
  signed_at?: string | null
  staff_name?: string | null
  floor?: string | null
  room?: string | null
}

export interface ClientOverlayData {
  id: string
  name: string
  type: 'student' | 'staff'
  overallStatus: 'Incomplete' | 'Pending' | 'Signed'
  totalDepartments: number
  signedDepartments: number
  courseName?: string
  courseYear?: number
  sectionNumber?: number | string
  semester?: number
  sectionId?: number | string
  sectionCode?: string
  departments: DepartmentClearanceProgress[]
  isOverdue?: boolean
  overduePhase?: number | null
  overduePhaseLabel?: string | null
  dwellHours?: number
}

interface ClientClearanceOverlayProps {
  client: ClientOverlayData | null
  onClose: () => void
}

function getInitials(name: string): string {
  if (!name) return 'CL'
  const clean = name.trim()
  if (clean.includes(',')) {
    const lastName = clean.split(',')[0].trim()
    if (lastName.length > 0) {
      return lastName.charAt(0).toUpperCase().repeat(2)
    }
  }
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return clean.slice(0, 2).toUpperCase()
}

function formatSignedDate(dateStr?: string | null): string | null {
  if (!dateStr) return null
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return null
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return null
  }
}

// ———— COMPONENT ————————————————————————————————————————————————————————————————————————————————————————————

export default function ClientClearanceOverlay({
  client,
  onClose,
}: ClientClearanceOverlayProps) {
  // Close on Escape key press & prevent background scroll
  useEffect(() => {
    if (!client) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [client, onClose])

  // Sorted departments by dynamic tier then department name
  const sortedDepartments = useMemo(() => {
    if (!client?.departments) return []

    return [...client.departments].sort((a, b) => {
      const tierA = a.tier ?? 1
      const tierB = b.tier ?? 1
      if (tierA !== tierB) return tierA - tierB
      return a.dept_name.localeCompare(b.dept_name)
    })
  }, [client?.departments])

  if (!client) return null

  // Progress metrics
  const total = sortedDepartments.length || client.totalDepartments || 0
  const signed = sortedDepartments.filter((d) => d.status === 'Signed').length
  const percent = total > 0 ? Math.min(100, Math.round((signed / total) * 100)) : 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-dossier-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full max-w-lg md:max-w-xl flex-col border-l border-slate-800 bg-[#060a14] shadow-2xl transition-transform animate-in slide-in-from-right duration-300 ease-out overflow-hidden"
      >
        {/* ── 1. Top Bar / Dossier Meta ── */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#070c18] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-slate-400">
              CLIENT CLEARANCE DOSSIER
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── 2. Client Profile Header ── */}
        <div className="border-b border-slate-800/80 bg-[#0a101f] p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-4">
            {/* Avatar Circle */}
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 text-base font-bold text-slate-100 shadow-md">
              {getInitials(client.name)}
            </div>

            {/* Client Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2
                  id="client-dossier-title"
                  className="text-lg sm:text-xl font-bold tracking-tight text-white truncate"
                >
                  {client.name}
                </h2>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs text-slate-400 tracking-wide">
                  {client.id}
                </span>

                <span className="text-slate-600">•</span>

                {/* Type Badge */}
                {client.type === 'student' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-blue-500/30 bg-blue-950/40 text-blue-400">
                    <GraduationCap className="w-3 h-3" />
                    STUDENT
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-emerald-500/30 bg-emerald-950/40 text-emerald-400">
                    <Briefcase className="w-3 h-3 text-emerald-400" />
                    STAFF
                  </span>
                )}

                {client.isOverdue && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-rose-500/40 bg-rose-950/40 text-rose-400">
                      OVERDUE ({client.overduePhaseLabel?.toUpperCase() || 'PHASE'})
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Academic / Program Context Card */}
          {client.type === 'student' ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#070c18] px-3 py-2 text-xs text-slate-300">
              <span className="font-semibold text-slate-200">
                {client.courseName ? shrinkCourseName(client.courseName) || client.courseName : 'No Course'}
              </span>
              {client.sectionCode ? (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="font-mono text-slate-300 font-medium">
                    {client.sectionCode}
                  </span>
                </>
              ) : client.courseYear ? (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="font-mono text-slate-300 font-medium">
                    {`${client.courseYear}/${client.semester ?? 1}-${client.sectionNumber ?? 1}`}
                  </span>
                </>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#070c18] px-3 py-2 text-xs text-slate-300">
              <Briefcase className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-medium text-slate-200">
                Institutional Employee Clearance
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">Faculty / Staff</span>
            </div>
          )}

          {/* ── 3. Fulfillment Summary Card ── */}
          <div className="rounded-xl border border-slate-800/80 bg-[#070c18]/90 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">
                OVERALL FULFILLMENT
              </span>
              <div className="flex items-center gap-2">
                {client.isOverdue && client.dwellHours !== undefined && (
                  <span className="text-[11px] text-rose-400/90 font-mono font-medium">
                    {client.dwellHours}h in queue
                  </span>
                )}
                <span className="font-bold text-slate-100 font-mono">
                  {signed} of {total} Departments
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(percent)}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── 4. Scrollable Department Progress Stepper ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              DEPARTMENT CLEARANCE PROGRESS
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {sortedDepartments.length} {sortedDepartments.length === 1 ? 'department' : 'departments'}
            </span>
          </div>

          {sortedDepartments.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No department clearances recorded for this client.
            </div>
          ) : (
            <div className="relative space-y-3.5">
              {sortedDepartments.map((dept, index) => {
                const DeptIcon = getDepartmentIcon(dept.icon_name || dept.dept_name)
                const isCleared = dept.status === 'Signed'
                const isPending = dept.status === 'Pending'
                const formattedDate = formatSignedDate(dept.signed_at)
                const locationStr = [dept.floor, dept.room].filter(Boolean).join(' · ')

                return (
                  <div
                    key={`${dept.dept_id || dept.dept_name}-${index}`}
                    className={`relative rounded-xl border p-4 transition-all duration-200 ${
                      isCleared
                        ? 'border-emerald-500/30 bg-[#0a141a]/60 hover:bg-[#0a141a]'
                        : 'border-slate-800 bg-[#0a101f] hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Department Icon & Details */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Icon Box */}
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs ${
                            isCleared
                              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                              : isPending
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                              : 'border-slate-700/60 bg-slate-800/50 text-slate-400'
                          }`}
                        >
                          <DeptIcon className="h-5 w-5" />
                        </div>

                        {/* Department Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-100 truncate">
                              {dept.dept_name}
                            </h3>
                            {dept.tier !== undefined && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border border-slate-700 bg-slate-800/80 text-amber-400 shrink-0">
                                PHASE {dept.tier}
                              </span>
                            )}
                          </div>

                          {/* Role / Office Signatory */}
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {dept.staff_name ? (
                              <span className="text-slate-300 font-medium">
                                {dept.staff_name}{' '}
                                <span className="text-slate-500 font-normal">· Signatory Officer</span>
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">Clearance Signatory</span>
                            )}
                          </p>

                          {/* Location & Signer Notes */}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-400">
                            {locationStr && (
                              <span className="flex items-center gap-1 text-slate-400">
                                <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                                {locationStr}
                              </span>
                            )}

                            {isCleared && formattedDate && (
                              <span className="flex items-center gap-1 text-emerald-400/90 font-mono">
                                <Calendar className="h-3 w-3 shrink-0" />
                                {formattedDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status Pill */}
                      <div className="shrink-0 flex items-center">
                        {isCleared ? (
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase leading-none border border-emerald-500/40 bg-emerald-950/40 text-emerald-400 shadow-xs">
                            CLEARED
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase leading-none border border-slate-700/80 bg-slate-800/70 text-slate-300 shadow-xs">
                            PENDING
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase leading-none border border-slate-700/80 bg-slate-800/70 text-slate-400 shadow-xs">
                            IN PROGRESS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
