"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  AlertTriangle,
  Building2,
  ChevronRight,
} from "lucide-react";
import type { DepartmentProgressItem } from "@/app/api/admin/pipeline-radar/route";
import { getDepartmentIcon } from "@/lib/department-icons";
import { getProgressBarColor } from "@/utils/formatters";
import TablePaginationFooter from "@/components/admin/table-pagination-footer";

interface Props {
  departments?: DepartmentProgressItem[];
  isLoading?: boolean;
}

const PAGE_SIZE = 10;

export default function DepartmentComplianceTable({
  departments = [],
  isLoading = false,
}: Props) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  const handleDepartmentClick = (dept: DepartmentProgressItem) => {
    if (dept.isBottleneck || dept.stalledCount > 0) {
      router.push(
        `/admin/clients?status=overdue&department=${encodeURIComponent(dept.deptName)}`
      );
    }
  };

  // Default sorted departments: bottlenecks first, then highest stalled count, then lowest compliance rate
  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => {
      if (a.totalAssigned > 0 && b.totalAssigned > 0) {
        if ((b.isBottleneck ? 1 : 0) !== (a.isBottleneck ? 1 : 0)) {
          return (b.isBottleneck ? 1 : 0) - (a.isBottleneck ? 1 : 0);
        }
        if (b.stalledCount !== a.stalledCount)
          return b.stalledCount - a.stalledCount;
        if (a.rate !== b.rate) return a.rate - b.rate;
        return b.pendingCount - a.pendingCount;
      }
      if (a.totalAssigned > 0) return -1;
      if (b.totalAssigned > 0) return 1;
      return a.deptName.localeCompare(b.deptName);
    });
  }, [departments]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedDepartments.length / PAGE_SIZE),
  );
  const validPage = Math.min(currentPage, totalPages);
  const paginatedDepartments = sortedDepartments.slice(
    (validPage - 1) * PAGE_SIZE,
    validPage * PAGE_SIZE,
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0a101f] shadow-2xl">
      {/* ── 1. Card Header ── */}
      <div className="flex flex-col gap-3 border-b border-slate-800 bg-[#070c18]/80 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Building2 className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-base font-bold tracking-tight text-white">
              Department Compliance
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Monitor overdue clearances and track compliance rates across all
            signatory departments.
          </p>
        </div>
      </div>

      {/* ── 2. Desktop Data Table ── */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-slate-800 bg-[#070c18] text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              <th className="px-6 py-4 text-left">DEPARTMENT & LOCATION</th>
              <th className="w-36 px-6 py-4 text-center">OVERDUE</th>
              <th className="w-64 px-6 py-4 text-center">COMPLIANCE RATE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {isLoading ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-16 text-center text-sm text-slate-400"
                >
                  Loading clearance compliance audit data...
                </td>
              </tr>
            ) : paginatedDepartments.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-16 text-center text-sm text-slate-400"
                >
                  No clearance offices configured.
                </td>
              </tr>
            ) : (
              paginatedDepartments.map((dept) => {
                const DeptIcon = getDepartmentIcon(
                  dept.iconName,
                  dept.deptName,
                );
                const isBottleneck = dept.isBottleneck;
                const isOptimal =
                  !isBottleneck && dept.stalledCount === 0 && dept.rate >= 85;
                const hasOverdueAction = isBottleneck || dept.stalledCount > 0;

                return (
                  <tr
                    key={dept.deptId}
                    onClick={() => handleDepartmentClick(dept)}
                    title={hasOverdueAction ? `View overdue clients for ${dept.deptName}` : undefined}
                    className={`group border-b border-slate-800/60 transition-colors ${
                      hasOverdueAction
                        ? "cursor-pointer hover:bg-slate-800/60"
                        : "hover:bg-slate-800/20"
                    }`}
                  >
                    {/* Department & Location */}
                    <td className="px-6 py-4 text-left">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-inner transition-ui ${
                            isOptimal
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : isBottleneck
                                ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                                : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          <DeptIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={`truncate text-sm font-semibold transition-colors ${
                                hasOverdueAction
                                  ? "text-slate-100 group-hover:text-amber-300"
                                  : "text-slate-100"
                              }`}
                              title={dept.deptName}
                            >
                              {dept.deptName}
                            </p>
                            {isBottleneck && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-rose-400 uppercase">
                                <AlertTriangle className="h-3 w-3" />
                                BOTTLENECK
                              </span>
                            )}
                          </div>
                          {dept.floor || dept.room ? (
                            <p className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-xs text-slate-400">
                              <MapPin className="h-3 w-3 shrink-0 text-amber-400" />
                              <span>
                                {[dept.floor, dept.room]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </p>
                          ) : (
                            <p className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-xs text-slate-500 italic">
                              <MapPin className="h-3 w-3 shrink-0 text-slate-600" />
                              <span>—</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Overdue Queue (Centered, number with chevron on hover, blank if 0) */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {dept.stalledCount > 0 ? (
                        <span className="inline-flex items-center gap-1 font-mono text-sm font-bold text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-md px-2 py-0.5 group-hover:bg-rose-500/20 group-hover:border-rose-500/40 transition-ui">
                          <span>{dept.stalledCount}</span>
                          <ChevronRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-ui" />
                        </span>
                      ) : null}
                    </td>

                    {/* Compliance Rate Bar & Percentage (Centered) */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-3">
                        <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-slate-800 sm:w-28">
                          <div
                            className={`h-full rounded-full w-full origin-left transition-transform duration-200 ease-out motion-reduce:transition-none ${getProgressBarColor(dept.rate)}`}
                            style={{ transform: `scaleX(${(dept.rate) / 100})` }}
                          />
                        </div>
                        <span
                          className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${
                            dept.rate === 100
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                              : "border-slate-700/80 bg-slate-800/80 text-slate-300"
                          }`}
                        >
                          {dept.rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── 3. Mobile Card List View ── */}
      <div className="divide-y divide-slate-800/60 md:hidden">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Loading audit data...
          </div>
        ) : paginatedDepartments.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No clearance offices configured.
          </div>
        ) : (
          paginatedDepartments.map((dept) => {
            const DeptIcon = getDepartmentIcon(dept.iconName, dept.deptName);
            const isBottleneck = dept.isBottleneck;
            const isOptimal =
              !isBottleneck && dept.stalledCount === 0 && dept.rate >= 85;
            const hasOverdueAction = isBottleneck || dept.stalledCount > 0;

            return (
              <div
                key={dept.deptId}
                onClick={() => handleDepartmentClick(dept)}
                className={`space-y-3 p-4 transition-colors ${
                  hasOverdueAction
                    ? "cursor-pointer hover:bg-slate-800/40 active:bg-slate-800/60"
                    : "hover:bg-slate-800/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-inner ${
                        isOptimal
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : isBottleneck
                            ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      <DeptIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className={`truncate text-sm font-semibold ${hasOverdueAction ? "text-slate-100 group-hover:text-amber-300" : "text-slate-100"}`}>
                          {dept.deptName}
                        </p>
                        {isBottleneck && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded border border-rose-500/30 bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-rose-400 uppercase">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            BOTTLENECK
                          </span>
                        )}
                      </div>
                      {dept.floor || dept.room ? (
                        <p className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-xs text-slate-400">
                          <MapPin className="h-3 w-3 shrink-0 text-amber-400" />
                          <span>
                            {[dept.floor, dept.room]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </p>
                      ) : (
                        <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-slate-500">
                          <MapPin className="h-3 w-3 shrink-0 text-slate-600" />
                          <span>—</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Overdue & Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between font-mono text-xs">
                    {dept.stalledCount > 0 ? (
                      <span className="inline-flex items-center gap-1 font-bold text-rose-400">
                        <span>{dept.stalledCount} overdue</span>
                        <ChevronRight className="h-3 w-3" />
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="font-bold text-amber-400">
                      {dept.rate}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full w-full origin-left transition-transform duration-200 ease-out motion-reduce:transition-none ${getProgressBarColor(dept.rate)}`}
                      style={{ transform: `scaleX(${(dept.rate) / 100})` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── 4. Card Footer with Pagination ── */}
      <TablePaginationFooter
        currentPage={validPage}
        pageSize={PAGE_SIZE}
        totalItems={sortedDepartments.length}
        itemLabel="offices"
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
