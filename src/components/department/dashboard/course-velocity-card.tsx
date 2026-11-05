"use client";

import { useMemo } from "react";
import { GraduationCap, Briefcase } from "lucide-react";
import type { CourseVelocity } from "@/modules/staff/application/repository/dashboard-repository";
import { shrinkCourseName } from "@/utils/formatters";

interface CourseVelocityCardProps {
  courses: CourseVelocity[];
}

export default function CourseVelocityCard({
  courses = [],
}: CourseVelocityCardProps) {
  // Sort courses by lowest signing rate so bottlenecks are prioritized at the top
  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => a.rate - b.rate);
  }, [courses]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl overflow-hidden flex flex-col h-[360px] md:h-[540px]">
      {/* ── Card Header ── */}
      <div className="px-3 py-3 md:px-6 md:py-4 border-b border-slate-800 bg-[#070c18] flex items-center justify-between gap-2 md:gap-4 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <GraduationCap className="h-4 w-4" />
            </span>
            <h3 className="text-sm md:text-base font-bold text-white tracking-tight">
              Course Clearance Progress
            </h3>
          </div>
          <p className="mt-0.5 text-[11px] md:text-xs text-slate-400 truncate">
            Degree programs ranked by clearance signing rate
          </p>
        </div>
      </div>

      {/* ── Scrollable Course Clearance List ── */}
      <div className="p-3 md:p-5 space-y-2 md:space-y-2.5 flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-track]:bg-transparent">
        {sortedCourses.length === 0 ? (
          <div className="text-center py-10">
            <GraduationCap className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-400">
              No clearance programs assigned
            </p>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xs mx-auto">
              Degree programs configured with your templates will show metrics here.
            </p>
          </div>
        ) : (
          sortedCourses.map((c, index) => {
            const isStaff =
              c.courseId === null || c.courseName.toLowerCase().includes("staff");
            const shortCode = isStaff ? "STAFF" : shrinkCourseName(c.courseName);

            return (
              <div
                key={c.courseId ?? `staff-${index}`}
                className="rounded-xl border border-slate-800/80 bg-[#070c18]/80 p-2.5 md:p-3.5 transition-ui hover:border-slate-700/90 hover:bg-[#0c1427]/80 group"
              >
                {/* Upper Row: Left Program Info & Right Velocity Metrics */}
                <div className="flex items-center justify-between gap-2 md:gap-3">
                  {/* Left: Icon, Rank, Program Pill, Middot & Enrolled Count */}
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <span
                      className={`flex h-7 w-7 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                        isStaff
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 group-hover:border-emerald-500/50"
                          : "border-slate-700/80 bg-slate-800/60 text-amber-400 group-hover:border-amber-500/40 group-hover:bg-amber-500/10"
                      }`}
                    >
                      {isStaff ? (
                        <Briefcase className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <GraduationCap className="h-4 w-4 text-amber-400" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                        {/* Ranking */}
                        <span className="text-[10px] md:text-xs font-mono font-bold text-slate-400">
                          #{index + 1}
                        </span>

                        {/* Program Acronym Badge */}
                        <span
                          className={`rounded-md border px-1.5 py-0.5 text-[10px] md:px-2 md:text-xs font-mono font-bold tracking-wide ${
                            isStaff
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                          }`}
                        >
                          {shortCode}
                        </span>

                        {/* Middot */}
                        <span className="text-slate-600 font-bold">·</span>

                        {/* Total Students Enrolled */}
                        <span className="text-[10px] md:text-xs text-slate-400 font-sans truncate">
                          {c.total}{" "}
                          {isStaff ? "staff enrolled" : "students enrolled"}
                        </span>
                      </div>

                      {/* Full Course Name */}
                      <p className="mt-0.5 md:mt-1 text-[10px] md:text-xs font-medium text-slate-400 truncate md:max-w-xs">
                        {c.courseName}
                      </p>
                    </div>
                  </div>

                  {/* Right: Signed Fraction & Grey Percentage Badge */}
                  <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] md:text-xs font-mono">
                        <span className="font-bold text-white">{c.signed}</span>
                        <span className="text-slate-400">/{c.total}</span>
                        <span className="hidden md:inline text-slate-500 text-[11px] font-sans ml-1">
                          signed
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 md:px-2.5 md:py-1 rounded-full font-bold border text-[10px] md:text-xs font-mono border-slate-700/80 bg-slate-800/80 text-slate-300">
                      {c.rate}%
                    </span>
                  </div>
                </div>

                {/* Compact Progress Bar */}
                <div className="mt-2 md:mt-2.5 h-1 md:h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full rounded-full w-full origin-left bg-[#f59e0b] transition-transform duration-200 ease-out motion-reduce:transition-none"
                    style={{ transform: `scaleX(${(c.rate) / 100})` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
