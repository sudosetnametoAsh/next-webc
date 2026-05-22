"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link"; // Added Link import
import {
  GraduationCap,
  LayoutGrid,
  Users,
  UserCheck,
  FileText,
  ChevronRight,
  BookOpen,
  Briefcase,
} from "lucide-react";
import { useDepartmentContext } from "@/context/deparment";
import AzureSignOutButton from "../auth/azure-sign-out-button";
import { useNotifications } from "@/hooks/clearance/use-notifications";

const MENU_ITEMS = [
  { name: "Dashboard", icon: LayoutGrid, path: "/department/dashboard" },
  { name: "Clients", icon: Users, path: "/department/clients" },
  { name: "My Clearance", icon: UserCheck, path: "/department/clearance" },
  { name: "Reports", icon: FileText, path: "/department/reports" },
];

export default function Sidebar( {department, user_name } : {department: string; user_name: string}) {
  const { courses, setCourseId, setSectionId, activeSectionId, viewType, setViewType, userId, hasStaffTemplates } =
    useDepartmentContext();
  const { unreadCount, unreadBySection, unreadByCourse, markSectionAsRead } = useNotifications(userId);
  const pathname = usePathname();
  const isClientsPage = pathname?.startsWith("/department/clients");

  const [expandedCourse, setExpandedCourse] = useState<string | null>("BSCS");

  const handleSectionClick = (sectionId: string) => {
    setSectionId(sectionId);
    if (unreadBySection[sectionId]) {
      markSectionAsRead.mutate(sectionId);
    }
  };

  return (
    <section className="flex h-screen w-[288px] flex-col bg-[#0A1128] text-white shadow-xl">
      {/* HEADER */}
      <header className="flex items-center gap-3 border-b border-white/10 p-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-400 text-[#0A1128]">
          <GraduationCap className="h-6 w-6" />
        </span>
        <span className="truncate text-lg leading-none font-bold tracking-wide text-white">
          STI College
        </span>
      </header>

      {/* MENU WRAPPER */}
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-6">
        {/* MAIN MENU SECTION */}
        <div className="flex shrink-0 flex-col gap-1">
          <span className="mb-2 px-4 text-[11px] font-bold tracking-wider text-slate-400">
            MAIN MENU
          </span>

          {/* Mapped Menu Items using Next.js Link */}
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.path);
            // const hasBadge = item.name === "Clients" && unreadCount > 0;

            return (
              <Link
                key={item.name}
                href={item.path}
                className={`group relative flex w-full items-center justify-between rounded-lg px-4 py-3 font-medium transition-all ${
                  isActive
                    ? "bg-amber-400 text-[#0A1128] shadow-md" // Active: Gold background, Navy text
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-4">
                  <Icon className="h-5 w-5" />
                  <span className={`text-sm ${isActive ? "font-bold" : ""}`}>
                    {item.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* {hasBadge && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#0A1128]">
                      {unreadCount}
                    </span>
                  )} */}
                  {/* Only show chevron for Clients menu item */}
                  {item.name === "Clients" && (
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${
                        isActive ? "rotate-90" : ""
                      }`}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* COURSES & SECTIONS SECTION */}
        {isClientsPage && (
          <div className="flex flex-col border-t border-white/10 pt-6">
            <span className="mb-3 shrink-0 px-4 text-[11px] font-bold tracking-wider text-slate-400">
              COURSE & SECTION
            </span>

            <div className="flex max-h-[35vh] flex-col gap-1 overflow-y-auto pr-2 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent">

              {/* Staff Section */}
              {hasStaffTemplates && (
                <button
                  onClick={() => {
                    setViewType('staff');
                    setExpandedCourse(null);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-4 py-3 transition-all ${
                    viewType === 'staff'
                      ? "bg-white/5 font-semibold text-amber-400"
                      : "font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Briefcase
                      className={`h-5 w-5 ${viewType === 'staff' ? "text-amber-400" : "text-slate-400"}`}
                    />
                    <span className="text-sm">Staff</span>
                  </div>
                </button>
              )}

              {courses?.map((course) => {
                const isExpanded = expandedCourse === course.course_name && viewType === 'students';
                // const courseUnread = unreadByCourse[String(course.course_id)] || 0;

                return (
                  <div key={course.course_id} className="flex flex-col">
                    {/* Course Button */}
                    <button
                      onClick={() => {
                        setViewType('students');
                        setExpandedCourse(
                          isExpanded ? null : course.course_name,
                        );
                        setCourseId(String(course.course_id));
                        setSectionId(null);
                      }}
                      className={`group relative flex w-full items-center justify-between rounded-lg px-4 py-3 transition-all ${
                        isExpanded
                          ? "bg-white/5 font-semibold text-amber-400"
                          : "font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <BookOpen
                          className={`h-5 w-5 ${isExpanded ? "text-amber-400" : "text-slate-400"}`}
                        />
                        <span className="text-sm">{course.course_name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* {courseUnread > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-[#0A1128]">
                            {courseUnread}
                          </span>
                        )} */}
                        {course.course_sections.length > 0 && (
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${
                              isExpanded
                                ? "rotate-90 text-amber-400"
                                : "text-slate-400"
                            }`}
                          />
                        )}
                      </div>
                    </button>

                    {/* Sections List */}
                    {isExpanded && course.course_sections.length > 0 && (
                      <div className="mt-1 mb-2 ml-6 flex flex-col gap-1 border-l-2 border-white/10 pl-4">
                        {course.course_sections.map((section) => {
                          const isActive =
                            String(section.section_id) === activeSectionId;
                          // const sectionUnread = unreadBySection[String(section.section_id)] || 0;

                          return (
                            <button
                              key={section.section_id}
                              onClick={() => handleSectionClick(String(section.section_id))}
                              className={`group relative flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${isActive ? "text-amber-400" : "text-slate-400"} transition-colors hover:bg-white/5 hover:text-white`}
                            >
                              <span>{`${section.section_number}/${section.year}-${section.semester}`}</span>
                              {/* {sectionUnread > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white shadow-sm ring-1 ring-[#0A1128]">
                                  {sectionUnread}
                                </span>
                              )} */}
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
        )}
      </div>

      {/* FOOTER */}
      <footer className="mt-auto flex h-20 shrink-0 items-center gap-3 border-t border-white/10 bg-[#0A1128] px-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-amber-400">
          NM
        </span>

        <div className="flex flex-col justify-center">
          <span className="text-sm leading-none font-semibold text-white">
            {user_name}
          </span>
          <span className="mt-1.5 text-xs leading-none text-slate-400">
            {department}
          </span>
        </div>
        <div className="ml-auto items-center flex">
          {/* <SignOutButton /> */}
          <AzureSignOutButton />
        </div>
      </footer>
    </section>
  );
}
