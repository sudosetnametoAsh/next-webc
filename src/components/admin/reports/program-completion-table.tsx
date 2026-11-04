"use client";

import { useState, useMemo } from "react";
import {
  GraduationCap,
  Briefcase,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { useFetchCourseTemplates } from "@/hooks/admin/course-templates";
import { useFetchStaffTemplates } from "@/hooks/admin/staff-templates";
import { shrinkCourseName, getProgressBarColor } from "@/utils/formatters";
import TablePaginationFooter from "@/components/admin/table-pagination-footer";

interface ProgramItem {
  id: string | number;
  code: string;
  name: string;
  enrolled: number;
  completion: number;
  type: "student" | "staff";
}

const PAGE_SIZE = 10;

export default function ProgramCompletionTable() {
  const { data: courseTemplates = [], isLoading: isLoadingCourses, error: courseError, refetch: refetchCourses } =
    useFetchCourseTemplates();
  const { data: staffTemplates = [], isLoading: isLoadingStaff, error: staffError, refetch: refetchStaff } =
    useFetchStaffTemplates();

  const [currentPage, setCurrentPage] = useState(1);

  const programList = useMemo<ProgramItem[]>(() => {
    const studentPrograms: ProgramItem[] = courseTemplates.map((cT) => ({
      id: cT.course_id ?? cT.course_name,
      code: shrinkCourseName(cT.course_name) || cT.course_name,
      name: cT.course_name,
      enrolled: cT.students_enrolled || 0,
      completion: Math.min(100, Math.max(0, cT.completion_rate || 0)),
      type: "student",
    }));

    const staffPrograms: ProgramItem[] = staffTemplates.map((sT) => ({
      id: "staff-roster",
      code: "STAFF",
      name: "Staff",
      enrolled: sT.students_enrolled || 0,
      completion: Math.min(100, Math.max(0, sT.completion_rate || 0)),
      type: "staff",
    }));

    return [...studentPrograms, ...staffPrograms];
  }, [courseTemplates, staffTemplates]);

  const totalItems = programList.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;

  // Safe page boundary
  const validPage = Math.min(currentPage, totalPages);

  const paginatedPrograms = useMemo(() => {
    const start = (validPage - 1) * PAGE_SIZE;
    return programList.slice(start, start + PAGE_SIZE);
  }, [programList, validPage]);

  const isLoading = isLoadingCourses || isLoadingStaff;

  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl">
      {/* ── Card Header ── */}
      <div className="flex shrink-0 flex-col justify-between gap-3 border-b border-slate-800 bg-[#070c18] px-6 py-5 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <GraduationCap className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold tracking-tight text-white">
              Completion Rate
            </h3>
          </div>
          <p className="mt-1 truncate text-xs text-slate-400">
            Completion rates across degree programs and personnel.
          </p>
        </div>

        {/* Legend */}
        <div className="flex shrink-0 items-center gap-3 font-mono text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            <span>Student</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>Staff</span>
          </div>
        </div>
      </div>

      {/* ── Table Area (Fixed Size Container) ── */}
      <div className="scrollbar-thin scrollbar-thumb-slate-800 flex flex-1 flex-col overflow-x-auto overflow-y-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 border-b border-slate-800 bg-[#070c18] font-mono text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            <tr>
              <th className="px-5 py-3 text-left">PROGRAM / PERSONNEL</th>
              <th className="px-5 py-3 text-left">CLIENTS</th>
              <th className="px-5 py-3 text-left">PROGRESS</th>
              <th className="px-5 py-3 text-right">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {isLoading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-24 text-center text-sm text-slate-400"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    <span>Loading program completion rates...</span>
                  </div>
                </td>
              </tr>
            ) : courseError || staffError ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-sm text-rose-300">
                  <p role="alert">Could not load completion rates.</p>
                  <button type="button" className="mt-3 rounded-lg border border-slate-700 px-3 py-2 text-slate-200"
                    onClick={() => void Promise.all([refetchCourses(), refetchStaff()])}>Retry</button>
                </td>
              </tr>
            ) : paginatedPrograms.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-24 text-center text-sm text-slate-400"
                >
                  No clearance programs or templates configured.
                </td>
              </tr>
            ) : (
              paginatedPrograms.map((item) => {
                const isStaff = item.type === "staff";
                const isComplete = item.completion === 100;
                const isStarted = item.completion > 0 && !isComplete;

                return (
                  <tr
                    key={item.id}
                    className="group border-b border-slate-800/60 transition-colors hover:bg-slate-800/40"
                  >
                    {/* Program / Roster Name */}
                    <td className="px-5 py-3 text-left">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-inner ${
                            isStaff
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {isStaff ? (
                            <Briefcase className="h-3.5 w-3.5" />
                          ) : (
                            <GraduationCap className="h-3.5 w-3.5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                isStaff
                                  ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                                  : "border-amber-500/30 bg-amber-500/15 text-amber-300"
                              }`}
                            >
                              {item.code}
                            </span>
                            <span
                              className="max-w-[180px] truncate text-xs font-medium text-slate-200 sm:max-w-[240px]"
                              title={item.name}
                            >
                              {item.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Enrolled Clients */}
                    <td className="px-5 py-3 text-left whitespace-nowrap">
                      <span className="font-mono text-xs text-slate-300">
                        <strong className="font-semibold text-white">
                          {item.enrolled}
                        </strong>{" "}
                        {isStaff ? "Staff" : "Students"}
                      </span>
                    </td>

                    {/* Completion Progress Bar */}
                    <td className="px-5 py-3 text-left whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-20 shrink-0 overflow-hidden rounded-full bg-slate-800 sm:w-28">
                          <div
                            className={`h-full rounded-full w-full origin-left transition-transform duration-200 ease-out motion-reduce:transition-none ${getProgressBarColor(item.completion)}`}
                            style={{ transform: `scaleX(${(item.completion) / 100})` }}
                          />
                        </div>
                        <span
                          className={`rounded border px-1.5 py-0.5 font-mono text-[11px] font-bold ${
                            isComplete
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                              : isStarted
                                ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                                : "border-slate-700/80 bg-slate-800/80 text-slate-400"
                          }`}
                        >
                          {item.completion}%
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {isComplete ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>COMPLETED</span>
                        </span>
                      ) : isStarted ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                          <Clock className="h-3 w-3" />
                          <span>IN PROGRESS</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-slate-700/60 bg-slate-800/60 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          NOT STARTED
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Card Footer & Pagination (Fixed to Bottom) ── */}
      <TablePaginationFooter
        currentPage={validPage}
        pageSize={PAGE_SIZE}
        totalItems={totalItems}
        itemLabel="programs"
        onPageChange={setCurrentPage}
        className="mt-auto"
      />
    </div>
  );
}
