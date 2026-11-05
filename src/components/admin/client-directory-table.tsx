'use client';
import type { ReactNode } from 'react';
import type { ClientItem } from './clients-page-client';
import { GraduationCap, Briefcase, ChevronRight } from 'lucide-react';
import { getProgressBarColor } from '@/utils/formatters';
import TablePaginationFooter from './table-pagination-footer';
function getClientInitials(name: string): string {
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

function ClientStatusBadge({
  status,
  isOverdue,
  overduePhaseLabel,
}: {
  status: 'Incomplete' | 'Pending' | 'Signed'
  isOverdue?: boolean
  overduePhaseLabel?: string | null
  hasAlert?: boolean
}) {
  if (status === 'Signed') {
    return (
      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border border-emerald-500/40 bg-emerald-950/30 text-emerald-400 whitespace-nowrap shadow-xs">
        FULLY CLEARED
      </span>
    )
  }

  if (isOverdue) {
    return (
      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border border-rose-500/40 bg-rose-950/30 text-rose-400 whitespace-nowrap shadow-xs">
        OVERDUE ({overduePhaseLabel?.toUpperCase() || 'PHASE'})
      </span>
    )
  }

  if (status === 'Pending') {
    return null
  }

  return (
    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border border-amber-500/40 bg-amber-950/30 text-amber-400 whitespace-nowrap shadow-xs">
      IN PROGRESS
    </span>
  )
}

export default function ClientDirectoryTable({ clients, totalItems, currentPage, pageSize, onPageChange, selectAllCheckbox, clientCheckbox, onClientClick, showChevron = true }: {
  clients: ClientItem[]; totalItems: number; currentPage: number; pageSize: number;
  onPageChange: (page: number) => void; selectAllCheckbox: () => ReactNode;
  clientCheckbox: (client: ClientItem) => ReactNode; onClientClick?: (client: ClientItem) => void; showChevron?: boolean;
}) { return (<>
      {/* ── Clients Table Card (Dark Theme) ── */}
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-800 bg-[#0a101f] shadow-2xl overflow-hidden">
        {/* Desktop Table (CLIENT, TYPE, CLEARANCE PROGRESS, STATUS, Action Chevron) */}
        <div className="hidden min-h-0 flex-1 overflow-auto md:block">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[36%]" />
              <col className="w-[18%]" />
              <col className="w-[26%]" />
              <col className="w-[16%]" />
              <col className="w-[4%]" />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-800 bg-[#070c18]">
                <th className="px-6 py-4 text-left text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  <div className="flex items-center gap-3">{selectAllCheckbox()}<span>CLIENT</span></div>
                </th>
                <th className="px-6 py-4 text-center text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  TYPE
                </th>
                <th className="px-6 py-4 text-center text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  CLEARANCE PROGRESS
                </th>
                <th className="px-6 py-4 text-center text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  STATUS
                </th>
                <th className="w-12 px-4 py-4 text-center"><span className="sr-only">View client</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-sm text-slate-400">
                    No clients match your selected filters.
                  </td>
                </tr>
              ) : (
                clients.map((client) => {
                  const total = client.totalDepartments || 0
                  const signed = client.signedDepartments || 0
                  const percent = total > 0 ? Math.min(100, Math.round((signed / total) * 100)) : 0
                  const hasAlert = signed > 0 && signed < total

                  return (
                    <tr
                      key={`${client.type}-${client.id}`}
                      onClick={() => onClientClick?.(client)}
                      className="group border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      {/* CLIENT Column - Left-aligned, text truncated so columns never shift */}
                      <td className="px-6 py-4 text-left overflow-hidden">
                        <div className="flex items-center gap-3 min-w-0 max-w-full">
                          {clientCheckbox(client)}
                          <div className="w-9 h-9 rounded-full bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                            {getClientInitials(client.name)}
                          </div>
                          <div className="min-w-0 text-left overflow-hidden">
                            <div
                              className="font-semibold text-slate-100 text-sm truncate max-w-[170px] lg:max-w-[240px] xl:max-w-[300px]"
                              title={client.name}
                            >
                              {client.name}
                            </div>
                            <div className="font-mono text-xs text-slate-500 truncate">
                              {client.type === 'staff' ? client.email || 'Email unavailable' : client.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* TYPE Column - Centered */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {client.type === 'student' ? (
                          <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border border-blue-500/30 bg-blue-950/40 text-blue-400">
                            <GraduationCap className="w-3.5 h-3.5" />
                            STUDENT
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border border-emerald-500/30 bg-emerald-950/40 text-emerald-400">
                            <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                            STAFF
                          </span>
                        )}
                      </td>

                      {/* CLEARANCE PROGRESS Column - Centered */}
                      <td className="px-6 py-4 text-center">
                        {total > 0 ? <div className="w-40 sm:w-44 mx-auto space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-medium">
                              {signed}/{total} depts
                            </span>
                            <span className="font-bold text-slate-200">
                              {percent}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-ui duration-200 ${getProgressBarColor(percent)}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div> : <span className="text-slate-500">—</span>}
                      </td>

                      {/* No template: show a dash instead of a clearance status. */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {total > 0 ? <ClientStatusBadge
                          status={client.overallStatus}
                          isOverdue={client.isOverdue}
                          overduePhaseLabel={client.overduePhaseLabel}
                          hasAlert={hasAlert}
                        /> : <span className="text-slate-500">—</span>}
                      </td>

                      {/* View client */}
                      <td className="w-12 px-4 py-4 text-center">
                        {showChevron && <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors inline-block" />}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="min-h-0 flex-1 overflow-auto md:hidden divide-y divide-slate-800/60">
          <div className="flex items-center gap-3 bg-[#070c18] px-4 py-4 text-xs text-slate-400">
            {selectAllCheckbox()}<span>Select all</span>
          </div>
          {clients.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-400">
              No clients match your selected filters.
            </div>
          ) : (
            clients.map((client) => {
              const total = client.totalDepartments || 0
              const signed = client.signedDepartments || 0
              const percent = total > 0 ? Math.min(100, Math.round((signed / total) * 100)) : 0
              const hasAlert = signed > 0 && signed < total

              return (
                <div
                  key={`${client.type}-${client.id}`}
                  onClick={() => onClientClick?.(client)}
                  className="px-4 py-4 space-y-3 hover:bg-slate-800/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {clientCheckbox(client)}
                      <div className="w-9 h-9 rounded-full bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                        {getClientInitials(client.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">
                          {client.name}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {client.type === 'staff' ? client.email || 'Email unavailable' : client.id}
                        </p>
                      </div>
                    </div>
                    {total > 0 ? <ClientStatusBadge
                      status={client.overallStatus}
                      isOverdue={client.isOverdue}
                      overduePhaseLabel={client.overduePhaseLabel}
                      hasAlert={hasAlert}
                    /> : <span className="text-slate-500">—</span>}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {client.type === 'student' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-blue-500/30 bg-blue-950/40 text-blue-400">
                        <GraduationCap className="w-3 h-3" />
                        STUDENT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-emerald-500/30 bg-emerald-950/40 text-emerald-400">
                        <Briefcase className="w-3 h-3 text-emerald-400" />
                        STAFF
                      </span>
                    )}

                    {total > 0 ? <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">
                        {signed}/{total} depts
                      </span>
                      <span className="text-xs font-bold text-slate-200">
                        {percent}%
                      </span>
                    </div> : <span className="text-slate-500">—</span>}
                  </div>

                  {total > 0 && <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-ui duration-200 ${getProgressBarColor(percent)}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>}
                </div>
              )
            })
          )}
        </div>

        {/* Pagination Footer */}
        <TablePaginationFooter
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          itemLabel={totalItems === 1 ? 'client' : 'clients'}
          onPageChange={onPageChange}
        />
      </div>

</>); }
