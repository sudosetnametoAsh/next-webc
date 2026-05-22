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
} from "lucide-react";
import { useDepartmentContext } from "@/context/deparment";
import AzureSignOutButton from "../auth/azure-sign-out-button";

const MENU_ITEMS = [
  { name: "Dashboard", icon: LayoutGrid, path: "/department/dashboard" },
  { name: "Students", icon: Users, path: "/department/students" },
  { name: "Clearance", icon: UserCheck, path: "/department/clearance" },
  { name: "Reports", icon: FileText, path: "/department/reports" },
];

export default function Sidebar( {department, user_name } : {department: string; user_name: string}) {
  const { courses, setCourseId, setSectionId, activeSectionId } =
    useDepartmentContext();
  const pathname = usePathname();
  const isStudentsPage = pathname?.startsWith("/department/students");

  const [expandedCourse, setExpandedCourse] = useState<string | null>("BSCS");

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

            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex w-full items-center justify-between rounded-lg px-4 py-3 font-medium transition-all ${
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
                {/* Only show chevron for Students menu item */}
                {item.name === "Students" && (
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      isActive ? "rotate-90" : ""
                    }`}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* COURSES & SECTIONS SECTION */}
        {isStudentsPage && (
          <div className="flex flex-col border-t border-white/10 pt-6">
            <span className="mb-3 shrink-0 px-4 text-[11px] font-bold tracking-wider text-slate-400">
              COURSE & SECTION
            </span>

            <div className="flex max-h-[35vh] flex-col gap-1 overflow-y-auto pr-2 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent">
              {courses?.map((course) => {
                const isExpanded = expandedCourse === course.course_name;

                return (
                  <div key={course.course_id} className="flex flex-col">
                    {/* Course Button */}
                    <button
                      onClick={() => {
                        setExpandedCourse(
                          isExpanded ? null : course.course_name,
                        );
                        setCourseId(String(course.course_id));
                        setSectionId(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-4 py-3 transition-all ${
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

                      {course.course_sections.length > 0 && (
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${
                            isExpanded
                              ? "rotate-90 text-amber-400"
                              : "text-slate-400"
                          }`}
                        />
                      )}
                    </button>

                    {/* Sections List */}
                    {isExpanded && course.course_sections.length > 0 && (
                      <div className="mt-1 mb-2 ml-6 flex flex-col gap-1 border-l-2 border-white/10 pl-4">
                        {course.course_sections.map((section) => {
                          const isActive =
                            String(section.section_id) === activeSectionId;
                          return (
                            <button
                              key={section.section_id}
                              onClick={() =>
                                setSectionId(String(section.section_id))
                              }
                              className={`w-full rounded-md px-3 py-2 text-left text-sm ${isActive ? "text-amber-400" : "text-slate-400"} transition-colors hover:bg-white/5 hover:text-white`}
                            >
                              {`${section.section_number}/${section.year}-${section.semester}`}
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
