'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Download,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Users,
  Loader2,
} from 'lucide-react'
import { useFetchStudentTemplates } from '@/hooks/admin/student-templates'
import { useFetchStaff } from '@/hooks/admin/fetch-staff'
import { useFetchAdminStats } from '@/hooks/admin/fetch-stats'
import { useAcademicPeriods } from '@/hooks/admin/academic-periods'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useFetchStaffTemplates } from '@/hooks/admin/staff-templates'
import { useFetchPipelineRadar } from '@/hooks/admin/dashboard'
import PhasePipelineRadar from '@/components/admin/dashboard/phase-pipeline-radar'
import ProgramCompletionTable from '@/components/admin/reports/program-completion-table'
import DepartmentComplianceTable from '@/components/admin/reports/department-compliance-table'
import { exportClearanceReport } from '@/utils/export-clearance-report'
import { getProgressBarColor } from '@/utils/formatters'
import { useToast } from '@/hooks/use-toast'

// ———— Main Reports Page Component ———————————————————————————————————————————

export default function Reports() {
  const [activeRadarFilter, setActiveRadarFilter] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportYear, setExportYear] = useState('')
  const { data: periods = [], isLoading: periodsLoading, isError: periodsError, refetch: reloadPeriods } = useAcademicPeriods()
  const years = [...new Set(periods.map(period => period.start_year))].sort((a, b) => b - a)

  const { success, error } = useToast()

  // Data queries
  const { data: adminStats } = useFetchAdminStats()
  const { data: studentTemplates = [] } = useFetchStudentTemplates()
  const { data: staffList = [] } = useFetchStaff()
  const {
    data: pipelineData,
    isLoading: isLoadingRadar,
  } = useFetchPipelineRadar(activeRadarFilter)

  // Executive Metric Calculations
  const totalStudents = adminStats?.totalStudents ?? studentTemplates.length ?? 0
  const totalStaffCount = adminStats?.totalStaff ?? staffList.length ?? 0
  const totalAllClients = adminStats?.totalClients ?? (totalStudents + totalStaffCount)
  const clearedTotal = adminStats?.signed ?? 0
  const totalRate = totalAllClients > 0 ? Math.round((clearedTotal / totalAllClients) * 100) : 0

  // Campus Overdue Backlog (>24h SLA)
  const overdueStudents = useMemo(() => {
    return studentTemplates.filter((s) => s.isOverdue).length
  }, [studentTemplates])

  const overdueStaff = useMemo(() => {
    return staffList.filter((s) => s.isOverdue).length
  }, [staffList])

  const totalOverdue = overdueStudents + overdueStaff
  const activePendingClients = Math.max(0, totalAllClients - clearedTotal)
  const overduePercent =
    activePendingClients > 0 ? Math.round((totalOverdue / activePendingClients) * 100) : 0

  // Final Endorsement Readiness (Terminal Phase or Cleared)
  const readyForFinalCount = useMemo(() => {
    if (pipelineData?.phase3) {
      return (pipelineData.phase3.readyCount || 0) + (pipelineData.phase3.clearedCount || 0)
    }
    return clearedTotal
  }, [pipelineData, clearedTotal])

  const readyForFinalPercent =
    totalAllClients > 0 ? Math.round((readyForFinalCount / totalAllClients) * 100) : 0

  // Primary Bottleneck Department
  const primaryBottleneck = useMemo(() => {
    if (!pipelineData?.departmentProgress || pipelineData.departmentProgress.length === 0) return null
    // Prioritize departments flagged as bottleneck, or having stalled clients > 24h
    const bottleneckDepts = pipelineData.departmentProgress.filter(
      (d) => d.totalAssigned > 0 && d.pendingCount > 0 && (d.isBottleneck || d.stalledCount > 0)
    )
    return bottleneckDepts[0] ?? null
  }, [pipelineData])

  // Handle Excel Audit Export
  const handleExport = async () => {
    if (!exportYear) return
    setIsExporting(true)
    try {
      const response = await fetch(`/api/admin/reports/export?startYear=${encodeURIComponent(exportYear)}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load export')
      const res = await exportClearanceReport({ ...data, academicYear: `${exportYear}-${Number(exportYear) + 1}` })
      setExportOpen(false)
      if (res.success) {
        success(`Successfully exported ${res.totalRecords} clearance records to Excel.`, 'Audit Export')
      }
    } catch (err: any) {
      error(err.message || 'Failed to export clearance report', 'Export Error')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <Dialog open={exportOpen} onOpenChange={open => { if (!isExporting) setExportOpen(open) }}>
        <DialogContent className="border-slate-800 bg-[#0a101f] text-white">
          <DialogHeader>
            <DialogTitle>Export clearance audit</DialogTitle>
            <DialogDescription className="text-slate-400">Which academic year would you like to export? The Excel workbook includes all terms in the selected year, with a worksheet for each program and Staff. Completed At uses Manila time.</DialogDescription>
          </DialogHeader>
          <label htmlFor="export-academic-year" className="text-sm font-medium">Academic year</label>
          <select id="export-academic-year" value={exportYear} onChange={event => setExportYear(event.target.value)} disabled={isExporting || periodsLoading} className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm">
            <option value="">Select an academic year</option>
            {years.map(year => <option key={year} value={year}>{year}–{year + 1}</option>)}
          </select>
          {periodsLoading && <p role="status" className="text-sm text-slate-400">Loading academic years…</p>}
          {periodsError && <p role="alert" className="text-sm text-rose-400">Unable to load academic years. <button type="button" onClick={() => void reloadPeriods()} className="underline">Retry</button></p>}
          {!periodsLoading && !periodsError && !years.length && <p className="text-sm text-slate-400">No academic years are available.</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setExportOpen(false)} disabled={isExporting} className="rounded-lg border border-slate-700 px-4 py-2 text-sm disabled:opacity-50">Cancel</button>
            <button type="button" onClick={handleExport} disabled={!exportYear || isExporting || periodsLoading || periodsError} className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">
              {isExporting && <Loader2 className="h-4 w-4 animate-spin" />}{isExporting ? 'Exporting…' : 'Download Excel'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="space-y-6">
        {/* ── 1. Page Header with Audit Export Button ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Clearance Reports & Audit
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Institutional compliance auditing, department turnaround velocity, and official report exports
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setExportYear(String(periods.find(period => period.is_active)?.start_year ?? years[0] ?? ''))
              setExportOpen(true)
            }}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-ui cursor-pointer self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
            ) : (
              <Download className="h-4 w-4 stroke-[2.5]" />
            )}
            <span>Export Audit (Excel)</span>
          </button>
        </div>

        {/* ── 2. Executive Audit Metric Strip ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Metric 1: Final Endorsement Ready */}
          <div className="rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                FINAL ENDORSEMENT READY
              </span>
              <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
                  {readyForFinalCount}
                </span>
                <span className="text-xs text-emerald-400 font-mono font-semibold">
                  ({readyForFinalPercent}%)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Clients ready or endorsed for final sign-off
              </p>
            </div>
          </div>

          {/* Metric 2: Primary Bottleneck Department */}
          {primaryBottleneck ? (
            <Link
              href={`/admin/clients?status=overdue&department=${encodeURIComponent(primaryBottleneck.deptName)}`}
              className="group rounded-2xl border border-slate-800 hover:border-slate-700 bg-[#0a101f] hover:bg-[#0c1427] shadow-xl p-5 flex flex-col justify-between transition-ui cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 group-hover:text-slate-300 transition-colors">
                  PRIMARY BOTTLENECK OFFICE
                </span>
                <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400 group-hover:text-slate-300 group-hover:border-slate-600 transition-colors">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-base sm:text-lg font-bold text-white truncate" title={primaryBottleneck.deptName}>
                      {primaryBottleneck.deptName}
                    </p>
                    {primaryBottleneck.isBottleneck && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                        BOTTLENECK
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs font-mono">
                    {primaryBottleneck.stalledCount > 0 ? (
                      <span className="text-rose-400 font-semibold">{primaryBottleneck.stalledCount} Overdue (&gt;24h)</span>
                    ) : (
                      <span className="text-amber-400 font-semibold">{primaryBottleneck.pendingCount} Pending</span>
                    )}
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">{primaryBottleneck.rate}% Cleared</span>
                  </div>
                  {primaryBottleneck.staffName && (
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      Officer: <span className="text-slate-300 font-medium">{primaryBottleneck.staffName}</span>
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  PRIMARY BOTTLENECK OFFICE
                </span>
                <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-base font-bold text-slate-300">No Bottlenecks</p>
                <p className="text-xs text-slate-400 mt-1">All departments operating smoothly</p>
              </div>
            </div>
          )}

          {/* Metric 3: Active Overdue Backlog (>24h SLA) */}
          <Link
            href="/admin/clients?status=overdue"
            className="group rounded-2xl border border-slate-800 hover:border-slate-700 bg-[#0a101f] hover:bg-[#0c1427] shadow-xl p-5 flex flex-col justify-between transition-ui cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 group-hover:text-slate-300 transition-colors">
                ACTIVE OVERDUE BACKLOG
              </span>
              <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400 group-hover:text-slate-300 group-hover:border-slate-600 transition-colors">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
                  {totalOverdue}
                </span>
                <span className="text-xs text-rose-400 font-mono font-semibold">
                  ({overduePercent}% of queue)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {totalOverdue > 0 ? (
                  <>
                    <span className="text-slate-300 font-medium">{overdueStudents} Students</span>
                    {overdueStaff > 0 && (
                      <>
                        {' '}·{' '}
                        <span className="text-slate-300 font-medium">{overdueStaff} Staff</span>
                      </>
                    )}
                    {' '}exceeding 24h phase SLA
                  </>
                ) : (
                  'All client queues operating within 24h SLA'
                )}
              </p>
            </div>
          </Link>

          {/* Metric 4: Campus Clearance Velocity */}
          <div className="rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                CAMPUS CLEARANCE RATE
              </span>
              <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-400">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
                  {clearedTotal}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  / {totalAllClients} Total ({totalRate}%)
                </span>
              </div>
              <div className="mt-2.5 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full w-full origin-left transition-transform duration-200 ease-out motion-reduce:transition-none ${getProgressBarColor(totalRate)}`}
                  style={{ transform: `scaleX(${(totalRate) / 100})` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Operational Overview: Program Progress & Phase Pipeline (1x2 Grid) ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
          <ProgramCompletionTable />
          <PhasePipelineRadar
            data={pipelineData}
            isLoading={isLoadingRadar}
            activeFilter={activeRadarFilter || pipelineData?.activeFilter || ''}
            onFilterChange={setActiveRadarFilter}
          />
        </div>

        {/* ── 4. Department Compliance & Audit Performance Table ── */}
        <div>
          <DepartmentComplianceTable
            departments={pipelineData?.departmentProgress}
            isLoading={isLoadingRadar}
          />
        </div>
      </div>
    </>
  )
}
