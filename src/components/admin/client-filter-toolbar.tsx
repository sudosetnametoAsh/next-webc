"use client";

import { useMemo } from "react";
import { Search, ChevronDown, GraduationCap, Briefcase } from "lucide-react";
import { shrinkCourseName } from "@/utils/formatters";
import { getDepartmentIcon } from "@/lib/department-icons";

export type ClientType = "all" | "students" | "staff";
export type ClientStatus = "all" | "pending" | "in-progress" | "cleared" | "overdue";

export interface SectionItem {
  section_id: number | string;
  section_number: number | string;
  year?: number;
  semester?: number;
  course_name?: string;
}

export interface CourseItem {
  course_id: number;
  course_name: string;
  course_sections?: SectionItem[];
}

export interface DepartmentFilterItem {
  dept_id: number;
  dept_name: string;
  icon_name?: string | null;
}

interface ClientFilterToolbarProps {
  // Counts
  allCount?: number;
  studentsCount?: number;
  staffCount?: number;
  filteredCount?: number;

  // Client Type
  clientType: ClientType;
  onClientTypeChange: (type: ClientType) => void;

  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // Status Filter
  selectedStatus: ClientStatus;
  onStatusChange: (status: ClientStatus) => void;

  // Course Filter
  courses?: CourseItem[];
  selectedCourse: string;
  onCourseChange: (course: string) => void;

  // Section Filter
  availableSections?: SectionItem[];
  selectedSection: string;
  onSectionChange: (section: string) => void;

  // Phase Filter
  availablePhases?: number[];
  selectedPhase?: string;
  onPhaseChange?: (phase: string) => void;

  // Department Filter
  availableDepartments?: DepartmentFilterItem[];
  selectedDepartment?: string;
  onDepartmentChange?: (dept: string) => void;
}

export function formatSectionCode(
  sec: {
    year?: number | string | null;
    semester?: number | string | null;
    section_number?: number | string | null;
    section_id?: number | string | null;
  },
  index?: number
): string {
  const year = sec.year ?? 1;
  const semester = sec.semester ?? 1;
  const section = sec.section_number ?? (index !== undefined ? index + 1 : 1);
  return `${year}/${semester}-${section}`;
}

export default function ClientFilterToolbar({
  allCount = 0,
  studentsCount = 0,
  staffCount = 0,
  filteredCount,
  clientType,
  onClientTypeChange,
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  courses = [],
  selectedCourse,
  onCourseChange,
  availableSections = [],
  selectedSection,
  onSectionChange,
  availablePhases = [1, 2, 3],
  selectedPhase = "all",
  onPhaseChange,
  availableDepartments = [],
  selectedDepartment = "all",
  onDepartmentChange,
}: ClientFilterToolbarProps) {
  // Sections breadcrumbs will only appear if clientType is 'students' AND filter is NOT "all" / "All Courses"
  const showSections =
    clientType === "students" &&
    selectedCourse !== "all" &&
    selectedCourse !== "All Courses" &&
    selectedCourse.trim() !== "";

  // Department breadcrumbs will appear if selectedStatus is 'overdue'
  const showDepartments =
    selectedStatus === "overdue" &&
    (availableDepartments.length > 0 || (selectedDepartment !== undefined && selectedDepartment !== "all")) &&
    Boolean(onDepartmentChange);

  // Phases breadcrumbs will appear if selectedStatus is 'overdue' and clientType is not 'staff'
  const showPhases =
    selectedStatus === "overdue" &&
    clientType !== "staff" &&
    (availablePhases.length > 0 || (selectedPhase !== undefined && selectedPhase !== "all")) &&
    Boolean(onPhaseChange);

  // Compute sections corresponding to the selected course
  const displayedSections = useMemo(() => {
    if (!showSections) return [];

    const matchedCourse = courses.find(
      (c) =>
        c.course_name.toLowerCase() === selectedCourse.toLowerCase() ||
        shrinkCourseName(c.course_name).toLowerCase() === selectedCourse.toLowerCase()
    );

    let list: SectionItem[] = [];

    if (matchedCourse?.course_sections && matchedCourse.course_sections.length > 0) {
      list = matchedCourse.course_sections;
    } else if (availableSections.length > 0) {
      list = availableSections;
    } else {
      list = [];
    }

    // Sort sections predictably: year asc, semester asc, section_number asc
    return [...list].sort((a, b) => {
      const yA = Number(a.year || 0);
      const yB = Number(b.year || 0);
      if (yA !== yB) return yA - yB;
      const sA = Number(a.semester || 0);
      const sB = Number(b.semester || 0);
      if (sA !== sB) return sA - sB;
      const nA = Number(a.section_number || 0);
      const nB = Number(b.section_number || 0);
      return nA - nB;
    });
  }, [showSections, selectedCourse, courses, availableSections]);

  const countDisplay = filteredCount !== undefined ? filteredCount : allCount;

  // Normalize selected course to match option value whether code or full name is passed
  const normalizedCourseValue = useMemo(() => {
    if (!selectedCourse || selectedCourse === "all") return "all";
    const matched = courses.find(
      (c) =>
        c.course_name.toLowerCase() === selectedCourse.toLowerCase() ||
        shrinkCourseName(c.course_name).toLowerCase() === selectedCourse.toLowerCase()
    );
    return matched ? matched.course_name : selectedCourse;
  }, [selectedCourse, courses]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-4 shadow-2xl backdrop-blur-sm space-y-3.5 select-none">
      {/* ── Top Row: Client Type Toggle + Search Bar + Optional Courses Filter ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Client Type Filter Pill Group (With amber active accent) */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-[#070c18] p-1 shrink-0 self-start sm:self-auto gap-1">
          {/* All */}
          <button
            type="button"
            onClick={() => onClientTypeChange("all")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all cursor-pointer ${
              clientType === "all"
                ? "border border-amber-500/40 bg-amber-500/15 text-amber-300 font-semibold shadow-xs"
                : "border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium"
            }`}
          >
            <span>All</span>
            <span className={`text-[11px] ${clientType === "all" ? "text-amber-400/80 font-mono" : "text-slate-500 font-mono"}`}>
              ({allCount})
            </span>
          </button>

          {/* Students */}
          <button
            type="button"
            onClick={() => onClientTypeChange("students")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all cursor-pointer ${
              clientType === "students"
                ? "border border-amber-500/40 bg-amber-500/15 text-amber-300 font-semibold shadow-xs"
                : "border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium"
            }`}
          >
            <GraduationCap className={`h-3.5 w-3.5 ${clientType === "students" ? "text-amber-400" : "text-slate-500"}`} />
            <span>Students</span>
            <span className={`text-[11px] ${clientType === "students" ? "text-amber-400/80 font-mono" : "text-slate-500 font-mono"}`}>
              ({studentsCount})
            </span>
          </button>

          {/* Staffs */}
          <button
            type="button"
            onClick={() => onClientTypeChange("staff")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all cursor-pointer ${
              clientType === "staff"
                ? "border border-amber-500/40 bg-amber-500/15 text-amber-300 font-semibold shadow-xs"
                : "border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium"
            }`}
          >
            <Briefcase className={`h-3.5 w-3.5 ${clientType === "staff" ? "text-amber-300" : "text-slate-500"}`} />
            <span className={clientType === "staff" ? "text-amber-300 font-semibold" : ""}>Staffs</span>
            <span className={`text-[11px] ${clientType === "staff" ? "text-amber-400/80 font-mono" : "text-slate-500 font-mono"}`}>
              ({staffCount})
            </span>
          </button>
        </div>

        {/* Search Bar Input (Matching exact palette from requirements & tasks page) */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search clients..."
            className="w-full rounded-xl border border-slate-800 bg-[#070c18] pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/40 transition-colors"
          />
        </div>

        {/* Courses Filter (Visible on the right side of the search bar ONLY when Students is selected) */}
        {clientType === "students" && (
          <div className="relative shrink-0 min-w-[160px] animate-in fade-in duration-200">
            <select
              value={normalizedCourseValue}
              onChange={(e) => onCourseChange(e.target.value)}
              className="appearance-none w-full rounded-xl border border-slate-800 bg-[#070c18] pl-3.5 pr-9 py-2.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/40 cursor-pointer transition-colors"
            >
              <option value="all">All Courses</option>
              {courses.map((course) => (
                <option key={course.course_id} value={course.course_name}>
                  {shrinkCourseName(course.course_name) || course.course_name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          </div>
        )}
      </div>

      {/* ── Status Breadcrumbs Row (Matching image design + counter) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase shrink-0 min-w-[55px]">
            STATUS
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: "all", label: "All" },
              { key: "pending", label: "Pending" },
              { key: "in-progress", label: "In Progress" },
              { key: "cleared", label: "Cleared" },
              { key: "overdue", label: "Overdue" },
            ].map((st) => {
              const isActive = selectedStatus === st.key;
              return (
                <button
                  type="button"
                  key={st.key}
                  onClick={() => onStatusChange(st.key as ClientStatus)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-sm"
                      : "border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* <span className="text-xs text-slate-500 shrink-0 self-end sm:self-center font-mono">
          Showing {countDisplay} {countDisplay === 1 ? "client" : "clients"}
        </span> */}
      </div>

      {/* ── Sections Breadcrumbs Row (Only appears if course filter is NOT "All Courses") ── */}
      {showSections && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 animate-in fade-in duration-200">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase shrink-0 min-w-[55px]">
            SECTIONS
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSectionChange("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                selectedSection === "all"
                  ? "border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-sm"
                  : "border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              All
            </button>
            {displayedSections.map((sec, i) => {
              const code = formatSectionCode(sec, i);
              const secId = String(sec.section_id ?? code);
              const isActive = selectedSection === secId || selectedSection === code;

              return (
                <button
                  type="button"
                  key={sec.section_id || code}
                  onClick={() => onSectionChange(secId)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-sm"
                      : "border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  {code}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Department Breadcrumbs Row (Only appears when status is 'overdue') ── */}
      {showDepartments && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 animate-in fade-in duration-200">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase shrink-0 min-w-[55px]">
            DEPARTMENT
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onDepartmentChange?.("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                selectedDepartment === "all"
                  ? "border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-sm"
                  : "border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              All
            </button>
            {availableDepartments.map((dept) => {
              const isActive =
                selectedDepartment?.toLowerCase() === dept.dept_name.toLowerCase() ||
                selectedDepartment === String(dept.dept_id);
              const DeptIcon = getDepartmentIcon(dept.icon_name, dept.dept_name);
              return (
                <button
                  type="button"
                  key={dept.dept_id}
                  onClick={() => onDepartmentChange?.(dept.dept_name)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-sm"
                      : "border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  <DeptIcon className={`h-3.5 w-3.5 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                  <span>{dept.dept_name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Phases Breadcrumbs Row (Only appears when status is 'overdue' and clientType is not 'staff') ── */}
      {showPhases && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 animate-in fade-in duration-200">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase shrink-0 min-w-[55px]">
            PHASES
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPhaseChange?.("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                selectedPhase === "all"
                  ? "border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-sm"
                  : "border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              All
            </button>
            {availablePhases.map((phase) => {
              const phaseKey = String(phase);
              const isActive = selectedPhase === phaseKey;
              return (
                <button
                  type="button"
                  key={phase}
                  onClick={() => onPhaseChange?.(phaseKey)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-sm"
                      : "border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  Phase {phase}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
