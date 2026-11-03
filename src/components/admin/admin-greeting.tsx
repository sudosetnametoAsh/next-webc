"use client";

import {
  Users,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
} from "lucide-react";
import { useFetchAdminStats } from "@/hooks/admin/fetch-stats";
import { useFetchDepartments } from "@/hooks/admin/departments";
import { useFetchCourseTemplates } from "@/hooks/admin/course-templates";
import { useFetchStudentTemplates } from "@/hooks/admin/student-templates";
import { useFetchStaff } from "@/hooks/admin/fetch-staff";
import { useFetchStaffTemplates } from "@/hooks/admin/staff-templates";
import { getProgressBarColor } from "@/utils/formatters";

interface AdminGreetingProps {
  userName?: string;
}

export default function AdminGreeting({ userName = "Administrator" }: AdminGreetingProps) {
  const { data: stats, isLoading: isLoadingStats } = useFetchAdminStats();
  const { data: departments = [], isLoading: isLoadingDepts } = useFetchDepartments();
  const { data: courseTemplates = [], isLoading: isLoadingTemplates } = useFetchCourseTemplates();
  const { data: studentTemplates = [], isLoading: isLoadingStudents } = useFetchStudentTemplates();
  const { data: staffList = [], isLoading: isLoadingStaff } = useFetchStaff();
  const { data: staffTemplates = [] } = useFetchStaffTemplates();

  const studentsCount = stats?.totalStudents ?? studentTemplates.length ?? 0;
  const staffCount = stats?.totalStaff ?? staffList.length ?? 0;
  const totalClients = stats?.totalClients ?? (studentsCount + staffCount);

  const departmentsCount = departments.length ?? 0;
  const hasStaffTemplate = staffTemplates.length > 0;
  const templatesCount = courseTemplates.length + (hasStaffTemplate ? 1 : 0);

  const clearedCount = stats?.signed ?? 0;
  const progressPercent = totalClients > 0
    ? Math.round((clearedCount / totalClients) * 100)
    : stats?.averageCompletion ?? 0;

  const isLoading =
    isLoadingStats ||
    isLoadingDepts ||
    isLoadingTemplates ||
    isLoadingStudents ||
    isLoadingStaff;

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-[#0a101f]/95 p-6 sm:p-7 shadow-xl backdrop-blur-md">
      {/* ── Top Greeting Header ── */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Welcome back, {userName}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl">
          Review submissions, verify client requirements, and issue official department clearance endorsements.
        </p>
      </div>

      {/* ── 4 Stat Cards Grid ── */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Total Clients */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#0c1427]/90 p-5 shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Users className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              TOTAL CLIENTS
            </span>
          </div>

          {isLoading ? (
            <div className="mt-3 space-y-2">
              <div className="h-8 w-24 bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-36 bg-slate-800/60 rounded animate-pulse" />
            </div>
          ) : (
            <div>
              <p className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {totalClients}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                <span>
                  <strong className="font-semibold text-slate-200">{studentsCount}</strong> students
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-amber-400/90 font-medium">
                  <strong className="font-semibold text-amber-300">{staffCount}</strong> staff participating
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Departments */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#0c1427]/90 p-5 shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              DEPARTMENTS
            </span>
          </div>

          {isLoading ? (
            <div className="mt-3 space-y-2">
              <div className="h-8 w-24 bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-36 bg-slate-800/60 rounded animate-pulse" />
            </div>
          ) : (
            <div>
              <p className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {departmentsCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Campus Departments
              </p>
            </div>
          )}
        </div>

        {/* Card 3: Templates */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#0c1427]/90 p-5 shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <FileSpreadsheet className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              TEMPLATES
            </span>
          </div>

          {isLoading ? (
            <div className="mt-3 space-y-2">
              <div className="h-8 w-24 bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-36 bg-slate-800/60 rounded animate-pulse" />
            </div>
          ) : (
            <div>
              <p className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {templatesCount}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Active Clearance Templates
              </p>
            </div>
          )}
        </div>

        {/* Card 4: Overall Progress */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#0c1427]/90 p-5 shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
              OVERALL PROGRESS ({progressPercent}%)
            </span>
          </div>

          {isLoading ? (
            <div className="mt-3 space-y-2">
              <div className="h-8 w-24 bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-36 bg-slate-800/60 rounded animate-pulse" />
            </div>
          ) : (
            <div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-400">
                  {clearedCount}
                </span>
                <span className="text-lg font-normal text-slate-400">
                  / {totalClients}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full w-full origin-left transition-transform duration-200 ease-out motion-reduce:transition-none ${getProgressBarColor(progressPercent)}`}
                  style={{ transform: `scaleX(${(progressPercent) / 100})` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Fully endorsed clearances
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
