"use client";

import { Drawer } from "@/components/ui/drawer";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Award,
  Calendar,
  BarChart3,
  ShieldCheck,
  User,
  ChevronDown,
  LogOut,
  X,
} from "lucide-react";
import AzureSignOutButton from "../auth/azure-sign-out-button";
import { useDepartmentNav } from "./department-nav-context";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchDepartmentClients } from "@/hooks/department/fetch-department-clients";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  department: string;
  user_name: string;
  user_id?: string;
}

export default function Sidebar({ department, user_name, user_id }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { mobileOpen, closeMobile } = useDepartmentNav();

  // Role switching is strictly exclusive to genuine department staff
  const isDepartmentStaff = Boolean(
    department &&
    department.trim() !== "" &&
    !["staff", "student", "admin", "all"].includes(department.toLowerCase())
  );

  // Pre-warm all department routes into the Client Router Cache on mount and persist staff department context
  useEffect(() => {
    try {
      if (isDepartmentStaff) {
        sessionStorage.setItem("clearance_staff_department", department);
        if (user_id) {
          sessionStorage.setItem(`clearance_staff_dept_${user_id}`, department);
        }
      } else {
        sessionStorage.removeItem("clearance_staff_department");
        if (user_id) {
          sessionStorage.removeItem(`clearance_staff_dept_${user_id}`);
        }
      }
    } catch {}

    router.prefetch("/department/dashboard");
    router.prefetch("/department/clients");
    router.prefetch("/department/calendar");
    router.prefetch("/department/reports");
    if (isDepartmentStaff) {
      router.prefetch("/clearance");
    }
    prefetchDepartmentClients(queryClient);
  }, [router, queryClient, department, user_id, isDepartmentStaff]);

  const avatarInitials = user_name
    ? user_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "DS";

  const navItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/department/dashboard",
      isActive: pathname === "/department/dashboard" || pathname === "/department",
    },
    {
      name: "Clients",
      icon: Users,
      path: "/department/clients",
      isActive: pathname.startsWith("/department/clients"),
    },
    {
      name: "My Calendar",
      icon: Calendar,
      path: "/department/calendar",
      isActive: pathname.startsWith("/department/calendar"),
    },
    {
      name: "Reports",
      icon: BarChart3,
      path: "/department/reports",
      isActive: pathname.startsWith("/department/reports"),
    },
  ];

  const renderContent = (isMobile = false) => (
    <div className="flex h-full flex-col">
      {/* ── Brand Header ── */}
      <div className="flex flex-col gap-4 border-b border-slate-800/80 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B] font-black text-slate-950 shadow-md shadow-amber-500/20">
              <span className="text-xs font-black tracking-tight">STI</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold tracking-tight text-white">
                STI WebC
              </span>
              <span className="text-xs font-medium text-slate-400">
                Department Staff
              </span>
            </div>
          </div>

          {isMobile && (
            <button
              type="button"
              onClick={closeMobile}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-200 cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Role Pill Indicator / Switcher */}
        {isDepartmentStaff ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="group flex w-full items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-amber-400 transition-ui hover:bg-amber-950/40 hover:border-amber-500/50 focus:outline-hidden focus:ring-1 focus:ring-amber-500/50 cursor-pointer select-none text-left"
                aria-label="Switch portal view"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
                  <span className="text-xs font-semibold tracking-wide truncate">
                    Department Staff
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-amber-400/80 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="bottom"
              sideOffset={4}
              className="w-(--radix-dropdown-menu-trigger-width) min-w-[200px] border-0 bg-transparent p-0 shadow-2xl shadow-black/90 z-50 rounded-lg overflow-hidden"
            >
              {/* Single Target Entry: Client Clearance (Green color) */}
              <DropdownMenuItem
                onMouseEnter={() => router.prefetch("/clearance")}
                onFocus={() => router.prefetch("/clearance")}
                onClick={() => {
                  router.push("/clearance");
                  if (isMobile) closeMobile();
                }}
                className="group flex w-full items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-[#060a14] px-3 py-2 text-emerald-400 transition-ui hover:bg-emerald-950/40 hover:border-emerald-500/50 focus:bg-emerald-950/40 focus:border-emerald-500/50 focus:text-emerald-400 cursor-pointer select-none text-left shadow-lg shadow-black/80 ring-0 outline-hidden"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="text-xs font-semibold tracking-wide truncate">
                    Client Clearance
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-amber-400 select-none">
            <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="text-xs font-semibold tracking-wide truncate">
              Department Staff
            </span>
          </div>
        )}
      </div>

      {/* ── Scrollable Menu Content ── */}
      <div className="flex flex-1 flex-col gap-4 p-4 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-track]:bg-transparent">
        {/* Main Navigation Links */}
        <nav className="flex flex-col gap-1.5">
          <span className="mb-1 px-3 text-[11px] font-semibold tracking-wider uppercase text-slate-500">
            Navigation
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.path}
                prefetch={true}
                onMouseEnter={() => {
                  router.prefetch(item.path);
                  if (item.path === "/department/clients") {
                    prefetchDepartmentClients(queryClient);
                  }
                }}
                onFocus={() => {
                  router.prefetch(item.path);
                  if (item.path === "/department/clients") {
                    prefetchDepartmentClients(queryClient);
                  }
                }}
                onTouchStart={() => {
                  router.prefetch(item.path);
                  if (item.path === "/department/clients") {
                    prefetchDepartmentClients(queryClient);
                  }
                }}
                onClick={(e) => {
                  if (item.isActive) {
                    if (isMobile) closeMobile();
                    e.preventDefault();
                    return;
                  }
                  if (isMobile) closeMobile();
                }}
                className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors ${
                  item.isActive
                    ? "border border-slate-700/60 bg-slate-800/70 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 font-medium"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 transition-colors ${
                    item.isActive
                      ? "text-amber-400"
                      : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Sidebar Footer ── */}
      <div className="border-t border-slate-800/80 p-3">
        <div className="flex items-center justify-between rounded-xl px-2 py-2 transition-colors hover:bg-slate-800/40">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700/80 bg-slate-800/90 text-xs font-bold text-amber-400 shadow-sm">
              {avatarInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-200">
                {user_name || "Staff Officer"}
              </p>
              <p className="truncate text-[11px] font-medium text-slate-400">
                {department || "Department"}
              </p>
            </div>
          </div>
          <AzureSignOutButton color="#94a3b8">
            <span
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-red-400 cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0" />
            </span>
          </AzureSignOutButton>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden h-dvh w-64 flex-col border-r border-slate-800/80 bg-[#060a14] text-slate-200 lg:flex lg:w-72 shrink-0 select-none">
        {renderContent(false)}
      </aside>

      {/* ── Mobile Drawer & Backdrop ── */}
      <Drawer open={mobileOpen} onClose={closeMobile} title="Department navigation" side="left" mobileOnly className="w-72 max-w-[calc(100vw-2rem)] border-r border-slate-800/80 select-none">
        {renderContent(true)}
      </Drawer>
    </>
  );
}
