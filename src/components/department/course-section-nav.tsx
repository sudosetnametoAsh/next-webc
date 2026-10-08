"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  BookOpen,
  Briefcase,
} from "lucide-react";
import { useDepartmentContext } from "@/context/deparment";
import { useNotifications } from "@/hooks/clearance/use-notifications";
import { cn } from "@/lib/utils";

export function CourseSectionNav() {
  const {
    courses,
    setCourseId,
    setSectionId,
    activeSectionId,
    viewType,
    setViewType,
    userId,
    hasStaffTemplates,
  } = useDepartmentContext();
  const { unreadBySection, markSectionAsRead } = useNotifications(userId);
  const pathname = usePathname();
  const isClientsPage = pathname?.startsWith("/department/clients");

  const [expandedCourse, setExpandedCourse] = useState<string | null>("BSCS");

  if (!isClientsPage) return null;

  const handleSectionClick = (sectionId: string) => {
    setSectionId(sectionId);
    if (unreadBySection[sectionId]) {
      markSectionAsRead.mutate(sectionId);
    }
  };

  return (
    <div className="flex flex-col w-full text-slate-700 dark:text-slate-300">
      <span className="mb-2 px-3 text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
        Course & Section
      </span>

      <div className="flex max-h-[35vh] flex-col gap-1 overflow-y-auto px-1 pr-1.5 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent">
        {/* Staff Section Option */}
        {hasStaffTemplates && (
          <button
            type="button"
            onClick={() => {
              setViewType("staff");
              setExpandedCourse(null);
            }}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer",
              viewType === "staff"
                ? "bg-amber-50 font-semibold text-amber-700 dark:bg-white/10 dark:text-amber-400"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
            )}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Briefcase
                className={cn(
                  "h-4 w-4 shrink-0",
                  viewType === "staff" ? "text-amber-600 dark:text-amber-400" : "text-slate-400"
                )}
              />
              <span className="truncate">Staff</span>
            </div>
          </button>
        )}

        {courses?.map((course) => {
          const isExpanded =
            expandedCourse === course.course_name && viewType === "students";

          return (
            <div key={course.course_id} className="flex flex-col">
              {/* Course Button */}
              <button
                type="button"
                onClick={() => {
                  setViewType("students");
                  setExpandedCourse(isExpanded ? null : course.course_name);
                  setCourseId(String(course.course_id));
                  setSectionId(null);
                }}
                className={cn(
                  "group relative flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer",
                  isExpanded
                    ? "bg-amber-50 font-semibold text-amber-700 dark:bg-white/10 dark:text-amber-400"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <BookOpen
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isExpanded ? "text-amber-600 dark:text-amber-400" : "text-slate-400"
                    )}
                  />
                  <span className="truncate">{course.course_name}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {course.course_sections.length > 0 && (
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        isExpanded
                          ? "rotate-90 text-amber-600 dark:text-amber-400"
                          : "text-slate-400"
                      )}
                    />
                  )}
                </div>
              </button>

              {/* Sections List */}
              {isExpanded && course.course_sections.length > 0 && (
                <div className="mt-1 mb-1.5 ml-4 flex flex-col gap-0.5 border-l border-slate-200 dark:border-white/10 pl-2.5">
                  {course.course_sections.map((section) => {
                    const isActive =
                      String(section.section_id) === activeSectionId;
                    const sectionUnread =
                      unreadBySection[String(section.section_id)] || 0;

                    return (
                      <button
                        key={section.section_id}
                        type="button"
                        onClick={() =>
                          handleSectionClick(String(section.section_id))
                        }
                        className={cn(
                          "group relative flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer",
                          isActive
                            ? "bg-amber-50 font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-400"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                        )}
                      >
                        <span className="truncate">
                          {`${section.section_number}/${section.year}-${section.semester}`}
                        </span>
                        {sectionUnread > 0 && (
                          <span className="ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-slate-950">
                            {sectionUnread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CourseSectionNav;
