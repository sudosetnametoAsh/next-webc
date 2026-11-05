"use client";

import { useMemo } from "react";
import {
  Search,
  ChevronDown,
  GraduationCap,
  Briefcase,
  SlidersHorizontal,
  ArrowDownAZ,
  ArrowUpZA,
  Check,
  Clock,
  History,
} from "lucide-react";
import { shrinkCourseName } from "@/utils/formatters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ClientType = "all" | "students" | "staff";
export type ClientStatus = "all" | "submissions" | "pending" | "incomplete" | "cleared";
export type SortFilter = "default" | "a-z" | "z-a" | "latest" | "old";

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

interface ClientFilterToolbarProps {
  // Counts
  allCount?: number;
  studentsCount?: number;
  staffCount?: number;
  filteredCount?: number;
  submissionsCount?: number;

  // Eligibility & Submissions Badges
  hasEligibleStudents?: boolean;
  hasEligibleStaff?: boolean;
  eligibleCourses?: Set<string>;
  eligibleSections?: Set<string>;
  hasUnviewedSubmissions?: boolean;

  // Client Type
  clientType: ClientType;
  onClientTypeChange: (type: ClientType) => void;

  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // Sort Filter: default, a-z, z-a
  selectedSort: SortFilter;
  onSortChange: (sort: SortFilter) => void;

  // Status Filter: pending, incomplete, cleared
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
  submissionsCount = 0,
  hasEligibleStudents = false,
  hasEligibleStaff = false,
  eligibleCourses,
  eligibleSections,
  hasUnviewedSubmissions = false,
  clientType,
  onClientTypeChange,
  searchQuery,
  onSearchChange,
  selectedSort = "default",
  onSortChange,
  selectedStatus,
  onStatusChange,
  courses = [],
  selectedCourse,
  onCourseChange,
  availableSections = [],
  selectedSection,
  onSectionChange,
}: ClientFilterToolbarProps) {
  // Sections breadcrumbs will only appear if clientType is 'students' AND filter is NOT "all" / "All Courses"
  const showSections =
    clientType === "students" &&
    selectedCourse !== "all" &&
    selectedCourse !== "All Courses" &&
    selectedCourse.trim() !== "";

  // Compute sections corresponding to the selected course
  const displayedSections = useMemo(() => {
    if (!showSections) return [];

    const matchedCourse = courses.find(
      (c) =>
        c.course_name.toLowerCase() === selectedCourse.toLowerCase() ||
        shrinkCourseName(c.course_name).toLowerCase() === selectedCourse.toLowerCase() ||
        String(c.course_id) === selectedCourse
    );

    let list: SectionItem[] = [];

    if (matchedCourse?.course_sections && matchedCourse.course_sections.length > 0) {
      list = matchedCourse.course_sections;
    } else if (availableSections.length > 0) {
      list = availableSections;
    } else {
      list = [];
    }

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

  // Normalize selected course to match option value
  const normalizedCourseValue = useMemo(() => {
    if (!selectedCourse || selectedCourse === "all") return "all";
    const matched = courses.find(
      (c) =>
        c.course_name.toLowerCase() === selectedCourse.toLowerCase() ||
        shrinkCourseName(c.course_name).toLowerCase() === selectedCourse.toLowerCase() ||
        String(c.course_id) === selectedCourse
    );
    return matched ? matched.course_name : selectedCourse;
  }, [selectedCourse, courses]);

  const hasEligibleCourses = useMemo(() => {
    return !!eligibleCourses && eligibleCourses.size > 0;
  }, [eligibleCourses]);

  return (
    <div className="rounded-xl md:rounded-2xl border border-slate-800 bg-[#0a101f] p-3 md:p-4 shadow-2xl backdrop-blur-sm space-y-2 md:space-y-3.5 select-none">
      {/* ── Top Row: Client Type Toggle + Search Bar + Dynamic Courses Filter ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
        {/* Client Type Filter Pill Group */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-[#070c18] p-1 shrink-0 self-start sm:self-auto gap-1">
          {/* All */}
          <button
            type="button"
            onClick={() => onClientTypeChange("all")}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] md:px-3 md:py-1.5 md:text-xs transition-ui cursor-pointer ${
              clientType === "all"
                ? "border border-amber-500/40 bg-amber-500/15 text-amber-300 font-semibold shadow-xs"
                : "border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium"
            }`}
          >
            <span>All</span>
            <span
              className={`text-[11px] ${
                clientType === "all" ? "text-amber-400/80 font-mono" : "text-slate-500 font-mono"
              }`}
            >
              ({allCount})
            </span>
          </button>

          {/* Students */}
          <button
            type="button"
            onClick={() => onClientTypeChange("students")}
            className={`relative flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] md:px-3 md:py-1.5 md:text-xs transition-ui cursor-pointer ${
              clientType === "students"
                ? "border border-amber-500/40 bg-amber-500/15 text-amber-300 font-semibold shadow-xs"
                : "border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium"
            }`}
          >
            <GraduationCap
              className={`h-3.5 w-3.5 ${clientType === "students" ? "text-amber-400" : "text-slate-500"}`}
            />
            <span>Students</span>
            <span
              className={`text-[11px] ${
                clientType === "students" ? "text-amber-400/80 font-mono" : "text-slate-500 font-mono"
              }`}
            >
              ({studentsCount})
            </span>
            {hasEligibleStudents && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-[#070c18]" />
              </span>
            )}
          </button>

          {/* Staffs */}
          <button
            type="button"
            onClick={() => onClientTypeChange("staff")}
            className={`relative flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] md:px-3 md:py-1.5 md:text-xs transition-ui cursor-pointer ${
              clientType === "staff"
                ? "border border-amber-500/40 bg-amber-500/15 text-amber-300 font-semibold shadow-xs"
                : "border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium"
            }`}
          >
            <Briefcase
              className={`h-3.5 w-3.5 ${clientType === "staff" ? "text-amber-300" : "text-slate-500"}`}
            />
            <span className={clientType === "staff" ? "text-amber-300 font-semibold" : ""}>
              Staffs
            </span>
            <span
              className={`text-[11px] ${
                clientType === "staff" ? "text-amber-400/80 font-mono" : "text-slate-500 font-mono"
              }`}
            >
              ({staffCount})
            </span>
            {hasEligibleStaff && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-[#070c18]" />
              </span>
            )}
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 md:left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={clientType === "staff" ? "Search staff by name or email..." : "Search clients by name, ID or email..."}
            className="w-full rounded-xl border border-slate-800 bg-[#070c18] pl-9 pr-3 py-2 text-[11px] md:pl-10 md:pr-4 md:py-2.5 md:text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/40 transition-colors"
          />
        </div>

        {/* Sort Filter Button: Default / A-Z / Z-A (or Latest / Old in Submissions mode) */}
        <div className="flex min-w-0 items-center gap-2 sm:contents">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-auto items-center justify-between gap-2 md:gap-2.5 shrink-0 rounded-xl border border-slate-800 bg-[#070c18] px-3 py-2 text-[11px] md:px-3.5 md:py-2.5 md:text-xs text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer select-none min-w-[100px] md:min-w-[120px] focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            >
              <div className="flex items-center gap-2">
                {selectedStatus === "submissions" ? (
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <SlidersHorizontal className="h-3.5 w-3.5 text-amber-400" />
                )}
                <span className="font-medium">
                  {selectedStatus === "submissions"
                    ? selectedSort === "old"
                      ? "Old"
                      : "Latest"
                    : selectedSort === "a-z"
                    ? "A-Z"
                    : selectedSort === "z-a"
                    ? "Z-A"
                    : "Default"}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 rounded-xl border border-slate-800 bg-[#070c18] p-1.5 shadow-2xl text-slate-300 backdrop-blur-md z-50"
          >
            {selectedStatus === "submissions" ? (
              <>
                <DropdownMenuItem
                  onClick={() => onSortChange("latest")}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors ${
                    selectedSort !== "old"
                      ? "bg-amber-500/15 text-amber-300 font-semibold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Latest</span>
                  </div>
                  {selectedSort !== "old" && (
                    <Check className="h-3.5 w-3.5 text-amber-400" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSortChange("old")}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors ${
                    selectedSort === "old"
                      ? "bg-amber-500/15 text-amber-300 font-semibold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <History className="h-3.5 w-3.5 text-slate-400" />
                    <span>Old</span>
                  </div>
                  {selectedSort === "old" && (
                    <Check className="h-3.5 w-3.5 text-amber-400" />
                  )}
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem
                  onClick={() => onSortChange("default")}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors ${
                    selectedSort === "default"
                      ? "bg-amber-500/15 text-amber-300 font-semibold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                    <span>Default</span>
                  </div>
                  {selectedSort === "default" && (
                    <Check className="h-3.5 w-3.5 text-amber-400" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSortChange("a-z")}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors ${
                    selectedSort === "a-z"
                      ? "bg-amber-500/15 text-amber-300 font-semibold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ArrowDownAZ className="h-3.5 w-3.5 text-slate-400" />
                    <span>A-Z (Name)</span>
                  </div>
                  {selectedSort === "a-z" && (
                    <Check className="h-3.5 w-3.5 text-amber-400" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSortChange("z-a")}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors ${
                    selectedSort === "z-a"
                      ? "bg-amber-500/15 text-amber-300 font-semibold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ArrowUpZA className="h-3.5 w-3.5 text-slate-400" />
                    <span>Z-A (Name)</span>
                  </div>
                  {selectedSort === "z-a" && (
                    <Check className="h-3.5 w-3.5 text-amber-400" />
                  )}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dynamic Courses Filter: visible ONLY when Students is selected */}
        {clientType === "students" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative flex min-w-0 max-w-full items-center justify-between gap-2 md:gap-2.5 sm:shrink-0 rounded-xl border border-slate-800 bg-[#070c18] px-3 py-2 text-[11px] md:px-3.5 md:py-2.5 md:text-xs text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer select-none md:min-w-[140px] focus:outline-none focus:ring-1 focus:ring-amber-500/50 animate-in ease-out fade-in duration-200"
              >
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  <GraduationCap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="font-medium truncate">
                    {normalizedCourseValue === "all"
                      ? "All Courses"
                      : shrinkCourseName(normalizedCourseValue) || normalizedCourseValue}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                {hasEligibleCourses && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-[#070c18]" />
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-[#070c18] p-1.5 shadow-2xl text-slate-300 backdrop-blur-md z-50"
            >
              <DropdownMenuItem
                onClick={() => onCourseChange("all")}
                className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors ${
                  normalizedCourseValue === "all"
                    ? "bg-amber-500/15 text-amber-300 font-semibold"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                  <span>All Courses</span>
                </div>
                {normalizedCourseValue === "all" && (
                  <Check className="h-3.5 w-3.5 text-amber-400" />
                )}
              </DropdownMenuItem>

              {courses.map((course) => {
                const isSelected = normalizedCourseValue === course.course_name;
                const displayName =
                  shrinkCourseName(course.course_name) || course.course_name;
                const isCourseEligible =
                  !!eligibleCourses &&
                  (eligibleCourses.has(course.course_name.toLowerCase().trim()) ||
                    eligibleCourses.has(shrinkCourseName(course.course_name).toLowerCase().trim()) ||
                    eligibleCourses.has(String(course.course_id)));
                return (
                  <DropdownMenuItem
                    key={course.course_id}
                    onClick={() => onCourseChange(course.course_name)}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-amber-500/15 text-amber-300 font-semibold"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate" title={course.course_name}>
                        {displayName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      {isCourseEligible && (
                        <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                      )}
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        </div>
      </div>

      {/* ── Status Breadcrumbs Row (All, Pending, Incomplete, Cleared) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase shrink-0 min-w-[55px]">
            STATUS
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {(() => {
              const statusItems: { key: ClientStatus; label: string }[] = [
                { key: "all", label: "All" },
                { key: "pending", label: "Pending" },
                { key: "incomplete", label: "Incomplete" },
                { key: "cleared", label: "Cleared" },
              ];

              if (submissionsCount > 0) {
                statusItems.push({ key: "submissions", label: "Submissions" });
              }

              return statusItems.map((st) => {
                const isActive = selectedStatus === st.key;
                const isSubmissionsWithUnviewed =
                  st.key === "submissions" && hasUnviewedSubmissions;

                return (
                  <button
                    type="button"
                    key={st.key}
                    onClick={() => onStatusChange(st.key)}
                    className={`relative rounded-full px-2.5 py-0.5 text-[10px] md:px-3 md:py-1 md:text-xs font-semibold transition-ui cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? "border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-sm"
                        : "border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    <span>{st.label}</span>
                    {isSubmissionsWithUnviewed && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-[#0a101f]" />
                      </span>
                    )}
                  </button>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* ── Dynamic Section Pills: Appear when a course is chosen ── */}
      {showSections && displayedSections.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-2 md:pt-3 animate-in ease-out fade-in duration-200">
          <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase shrink-0 min-w-[55px]">
            SECTION
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSectionChange("all")}
              className={`rounded-full px-2.5 py-0.5 text-[10px] md:px-3 md:text-xs font-semibold transition-ui cursor-pointer ${
                selectedSection === "all"
                  ? "border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-sm"
                  : "border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              All
            </button>
            {displayedSections.map((sec, idx) => {
              const secCode = formatSectionCode(sec, idx);
              const secIdStr = String(sec.section_id);
              const cleanSelected = selectedSection.includes(" ")
                ? selectedSection.split(" ").slice(1).join(" ").trim()
                : selectedSection.trim();

              const isActive =
                selectedSection === secIdStr ||
                selectedSection === secCode ||
                cleanSelected === secCode ||
                cleanSelected === secIdStr ||
                selectedSection.endsWith(secCode);

              // Check eligibility by unique section ID or course-scoped section code
              const courseKey = selectedCourse !== "all" ? selectedCourse.toLowerCase().trim() : "";
              const isSectionEligible =
                !isActive &&
                !!eligibleSections &&
                (eligibleSections.has(secIdStr) ||
                  (courseKey !== "" &&
                    (eligibleSections.has(`${courseKey}::${secCode}`) ||
                      eligibleSections.has(`${shrinkCourseName(courseKey).toLowerCase().trim()}::${secCode}`) ||
                      eligibleSections.has(`${courseKey}::${secIdStr}`))));

              return (
                <button
                  type="button"
                  key={sec.section_id || idx}
                  onClick={() => onSectionChange(secIdStr)}
                  className={`relative rounded-full px-2.5 py-0.5 text-[10px] md:px-3 md:text-xs font-semibold transition-ui cursor-pointer ${
                    isActive
                      ? "border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-sm"
                      : "border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  <span>{secCode}</span>
                  {isSectionEligible && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2 pointer-events-none">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 ring-2 ring-[#0a101f]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
