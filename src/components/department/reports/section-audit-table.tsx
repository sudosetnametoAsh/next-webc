"use client";

import React, { useState, useMemo } from "react";
import {
  GraduationCap,
  Briefcase,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Filter,
  Users,
} from "lucide-react";
import { ProgramAuditItem } from "@/modules/staff/application/repository/dashboard-repository";
import { getProgressBarColor } from "@/utils/formatters";

interface Props {
  programs: ProgramAuditItem[];
  departmentName: string;
}

export default function SectionAuditTable({ programs, departmentName }: Props) {
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>(() => {
    // Default all programs to expanded
    const initial: Record<string, boolean> = {};
    programs.forEach((p) => {
      initial[p.programCode] = true;
    });
    return initial;
  });

  const toggleExpand = (programCode: string) => {
    setExpandedPrograms((prev) => ({
      ...prev,
      [programCode]: !prev[programCode],
    }));
  };

  // Filtered Programs & Sections
  const filteredPrograms = useMemo(() => {
    return programs
      .filter((p) => {
        if (selectedProgram !== "all" && p.programCode !== selectedProgram) {
          return false;
        }
        return true;
      })
      .map((p) => {
        // Filter sections within program
        const matchingSections = p.sections.filter((s) => {
          if (
            searchQuery.trim() &&
            !s.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
          ) {
            return false;
          }
          return true;
        });

        return {
          ...p,
          matchingSections,
        };
      })
      .filter((p) => {
        // If searching, only show programs that have matching sections
        if (searchQuery.trim()) {
          return p.matchingSections.length > 0;
        }
        return true;
      });
  }, [programs, selectedProgram, searchQuery]);

  const totalClientsAll = useMemo(
    () => programs.reduce((sum, p) => sum + p.total, 0),
    [programs],
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl">
      {/* ── Card Header ── */}
      <div className="border-b border-slate-800 bg-[#070c18] p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <Users className="h-4 w-4" />
          </span>
          <h3 className="text-base font-bold tracking-tight text-white">
            Academic Program & Section Clearance Audit
          </h3>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Granular completion breakdown across enrolled degree courses and staff rosters in {departmentName}
        </p>
      </div>

      {/* ── Filter Controls Row ── */}
      <div className="flex flex-col gap-3 border-b border-slate-800/80 bg-slate-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Program Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedProgram("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              selectedProgram === "all"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
            }`}
          >
            All Programs ({totalClientsAll})
          </button>

          {programs.map((p) => {
            const isSelected = selectedProgram === p.programCode;
            const isStaff = p.programCode === "STAFF";

            return (
              <button
                key={p.programCode}
                type="button"
                onClick={() => setSelectedProgram(p.programCode)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                }`}
              >
                {isStaff ? (
                  <Briefcase className="h-3 w-3" />
                ) : (
                  <GraduationCap className="h-3 w-3" />
                )}
                <span>{p.programCode}</span>
                <span className="font-mono text-[10px] opacity-75">
                  ({p.total})
                </span>
              </button>
            );
          })}
        </div>

        {/* Real-time Section Search */}
        <div className="relative min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search section (e.g. 4-1, Sem 1)..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-1.5 pl-8.5 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
      </div>

      {/* ── Table / Accordion Body ── */}
      <div className="divide-y divide-slate-800/60">
        {filteredPrograms.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No programs or sections match the selected filter criteria.
          </div>
        ) : (
          filteredPrograms.map((p) => {
            const isExpanded = !!expandedPrograms[p.programCode];
            const isStaff = p.programCode === "STAFF";
            const sectionsToRender = p.matchingSections ?? p.sections;

            return (
              <div key={p.programCode} className="group">
                {/* ── Program Header Row (Clickable) ── */}
                <div
                  onClick={() => toggleExpand(p.programCode)}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-900/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      aria-label="Toggle Section Details"
                      className="text-slate-400 hover:text-white"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-amber-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                        isStaff
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {isStaff ? (
                        <Briefcase className="h-4 w-4" />
                      ) : (
                        <GraduationCap className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white truncate">
                          {p.programName}
                        </span>
                        <span className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-300">
                          {p.programCode}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {p.sections.length} Section
                        {p.sections.length !== 1 ? "s" : ""} · {p.total} Enrolled
                      </div>
                    </div>
                  </div>

                  {/* Program Macro Numbers & Progress */}
                  <div className="flex items-center gap-6 sm:justify-end">
                    <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
                      <div>
                        <span className="text-slate-500">Cleared: </span>
                        <span className="text-emerald-400 font-bold">
                          {p.signed}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Pending: </span>
                        <span className="text-amber-400 font-bold">
                          {p.pending}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Incomplete: </span>
                        <span className="text-slate-400">{p.incomplete}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 min-w-[140px]">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-900 border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                            p.rate,
                          )}`}
                          style={{ width: `${p.rate}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-mono text-xs font-bold text-white">
                        {p.rate}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Expanded Section Table ── */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-950/60 px-5 sm:px-14 py-3">
                    {sectionsToRender.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-500 italic">
                        No sections match your filter.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sectionsToRender.map((s) => {
                          return (
                            <div
                              key={s.label}
                              className="flex flex-col gap-2 rounded-xl border border-slate-800/60 bg-[#0a101f]/70 p-3 sm:flex-row sm:items-center sm:justify-between hover:border-slate-700/80 transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                <span className="text-xs font-medium text-slate-200">
                                  {s.label}
                                </span>
                              </div>

                              <div className="flex items-center gap-5 sm:justify-end">
                                <div className="flex items-center gap-3 font-mono text-[11px]">
                                  <span className="text-slate-400">
                                    Total:{" "}
                                    <strong className="text-white">
                                      {s.total}
                                    </strong>
                                  </span>
                                  <span className="text-slate-400">
                                    Signed:{" "}
                                    <strong className="text-emerald-400">
                                      {s.signed}
                                    </strong>
                                  </span>
                                  <span className="text-slate-400">
                                    Pending:{" "}
                                    <strong className="text-amber-400">
                                      {s.pending}
                                    </strong>
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 min-w-[120px]">
                                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-900 border border-slate-800">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(
                                        s.rate,
                                      )}`}
                                      style={{ width: `${s.rate}%` }}
                                    />
                                  </div>
                                  <span className="w-8 text-right font-mono text-[11px] font-bold text-slate-300">
                                    {s.rate}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
