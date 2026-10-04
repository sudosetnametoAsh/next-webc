"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
  GraduationCap,
  Shield,
  Briefcase,
  UserCheck,
  LayoutDashboard,
  Users,
  Sheet,
  FileText,
  LayoutGrid,
  FileCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface RoleSidebarProps {
  session: {
    user_id: string;
    user_name: string;
    user_email: string;
    role: "Admin" | "Staff" | "Department" | "Student";
    department?: string;
  };
  collapsed: boolean;
  onToggleCollapse: () => void;
  extraContent?: React.ReactNode;
  onNavigate?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function getInitials(fullName?: string): string {
  if (!fullName) return "??";
  const clean = fullName.replace(/\s*\(.*?\)\s*/g, "").replace(/,/g, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getRoleConfig(role: string, department?: string) {
  switch (role) {
    case "Admin":
      return {
        title: "Admin Workspace",
        shortTitle: "Admin",
        Icon: Shield,
        badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/20",
      };
    case "Staff":
    case "Department":
      return {
        title: department ? `Faculty Hub - ${department}` : "Faculty Hub",
        shortTitle: department || "Faculty",
        Icon: Briefcase,
        badgeClass: "bg-blue-500/10 text-blue-300 border-blue-500/20",
      };
    case "Student":
    default:
      return {
        title: "Student Clearance",
        shortTitle: "Student",
        Icon: UserCheck,
        badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
      };
  }
}

function getNavItems(role: string): NavItem[] {
  switch (role) {
    case "Admin":
      return [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Students", href: "/admin/students", icon: Users },
        { label: "Templates", href: "/admin/templates", icon: Sheet },
        { label: "Reports", href: "/admin/reports", icon: FileText },
      ];
    case "Staff":
    case "Department":
      return [
        { label: "Dashboard", href: "/department/dashboard", icon: LayoutGrid },
        { label: "Client Queue", href: "/department/clients", icon: Users },
        { label: "Staff Clearance", href: "/department/clearance", icon: UserCheck },
        { label: "Reports", href: "/department/reports", icon: FileText },
      ];
    case "Student":
    default:
      return [
        { label: "My Clearance", href: "/student", icon: UserCheck },
        { label: "Requirements & Tasks", href: "/student?tab=tasks", icon: FileCheck },
        { label: "Department Schedules", href: "/student?tab=offices", icon: Clock },
      ];
  }
}

function RoleSidebarNavList({
  items,
  collapsed,
  onNavigate,
}: {
  items: NavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isItemActive = (href: string) => {
    const [itemPath, itemQuery] = href.split("?");
    if (itemQuery) {
      if (pathname !== itemPath) return false;
      const params = new URLSearchParams(itemQuery);
      for (const [key, val] of params.entries()) {
        if (searchParams.get(key) !== val) return false;
      }
      return true;
    }

    if (itemPath === "/student") {
      if (pathname !== "/student") return false;
      const tab = searchParams.get("tab");
      return !tab || tab === "overview";
    }

    if (pathname === itemPath) return true;
    if (itemPath !== "/" && pathname.startsWith(itemPath + "/")) return true;
    return false;
  };

  return (
    <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto overflow-x-hidden">
      {items.map((item) => {
        const active = isItemActive(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 transition-colors duration-150 text-sm font-medium",
              collapsed
                ? "justify-center h-11 w-11 mx-auto rounded-lg"
                : "px-3.5 py-2.5 rounded-r-lg border-l-4",
              active
                ? collapsed
                  ? "bg-[#16273e] text-amber-400 font-semibold ring-1 ring-amber-500/40"
                  : "bg-white/10 text-white border-amber-500 font-semibold shadow-xs"
                : collapsed
                ? "text-slate-400 hover:text-white hover:bg-white/5"
                : "text-slate-400 hover:text-white hover:bg-white/5 border-transparent"
            )}
            title={collapsed ? item.label : undefined}
          >
            {collapsed && active && (
              <span className="absolute -left-1 top-2 bottom-2 w-1 bg-amber-500 rounded-r" />
            )}

            <Icon
              className={cn(
                "w-5 h-5 shrink-0 transition-colors",
                active ? "text-amber-400" : "text-slate-400 group-hover:text-white"
              )}
            />

            {!collapsed && <span className="truncate">{item.label}</span>}

            {collapsed && (
              <span className="pointer-events-none absolute left-full ml-3 hidden group-hover:flex items-center px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 border border-slate-700 rounded-md whitespace-nowrap shadow-xl z-50 animate-in fade-in-0 duration-150">
                {item.label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function RoleSidebar({
  session,
  collapsed,
  onToggleCollapse,
  extraContent,
  onNavigate,
}: RoleSidebarProps) {
  const [logoError, setLogoError] = useState(false);
  const roleConfig = getRoleConfig(session.role, session.department);
  const RoleIcon = roleConfig.Icon;
  const navItems = getNavItems(session.role);
  const initials = getInitials(session.user_name);

  return (
    <aside
      className={cn(
        "h-full flex flex-col justify-between select-none bg-[#0B192C] text-white border-r border-white/10 transition-[width] duration-200 ease-in-out shrink-0",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Branding Header */}
      <div className="shrink-0 border-b border-white/10">
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-4",
            collapsed && "justify-center px-2"
          )}
        >
          <div className="relative w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 overflow-hidden">
            {!logoError ? (
              <Image
                src="/stilogo.png"
                alt="STI College Logo"
                width={32}
                height={32}
                className="object-contain"
                priority
                onError={() => setLogoError(true)}
              />
            ) : (
              <GraduationCap className="w-5 h-5 text-amber-400" />
            )}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold text-white tracking-tight leading-tight truncate">
                STI WebC
              </span>
              <span className="text-xs font-medium text-slate-400 truncate">
                Clearance Portal
              </span>
            </div>
          )}
        </div>

        {/* Distinctive Role Badge */}
        <div
          className={cn(
            "px-4 pb-3",
            collapsed && "px-2 flex justify-center pb-3"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold",
              roleConfig.badgeClass,
              collapsed && "p-2 justify-center"
            )}
            title={collapsed ? roleConfig.title : undefined}
          >
            <RoleIcon className="w-4 h-4 shrink-0 text-amber-400" />
            {!collapsed && <span className="truncate">{roleConfig.title}</span>}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <Suspense
        fallback={
          <div className="flex-1 p-3 space-y-2">
            <div className="h-8 bg-white/5 rounded-md animate-pulse" />
            <div className="h-8 bg-white/5 rounded-md animate-pulse" />
            <div className="h-8 bg-white/5 rounded-md animate-pulse" />
          </div>
        }
      >
        <RoleSidebarNavList
          items={navItems}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      </Suspense>

      {/* Extra Content (if any) */}
      {extraContent && (
        <div
          className={cn(
            "shrink-0 px-3 py-2 border-t border-white/10",
            collapsed && "px-1 flex justify-center"
          )}
        >
          {extraContent}
        </div>
      )}

      {/* Bottom User Footer */}
      <div className="shrink-0 border-t border-white/10 bg-black/20 p-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center justify-center text-xs shrink-0 cursor-default"
              title={`${session.user_name} (${session.role})`}
            >
              {initials}
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Expand sidebar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center justify-center text-xs shrink-0">
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate max-w-[130px]">
                  {session.user_name}
                </span>
                <span className="text-[11px] font-medium text-slate-400 truncate max-w-[130px]">
                  {session.department
                    ? `${session.role} • ${session.department}`
                    : session.role}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Collapse sidebar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default RoleSidebar;
