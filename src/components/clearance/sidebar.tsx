"use client";

import { usePortalPrefetch } from "@/hooks/navigation/use-portal-prefetch";
import { Drawer } from "@/components/ui/drawer";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Award,
  Clock,
  FileText,
  User,
  ShieldCheck,
  ChevronDown,
  LogOut,
  X,
} from "lucide-react";
import AzureSignOutButton from "@/components/auth/azure-sign-out-button";
import { useClearanceNav } from "./clearance-nav-context";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchClearanceData } from "@/hooks/clearance/use-clearance-data";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface StudentSidebarProps {
  user?: {
    name?: string;
    email?: string;
    role?: string;
    avatarInitials?: string;
    department?: string;
    userId?: string;
    canAccessDepartment?: boolean;
  };
}

export default function Sidebar({ user }: StudentSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { mobileOpen, closeMobile } = useClearanceNav();

  const [cachedDept, setCachedDept] = useState<string | null>(null);

  const isStudent = Boolean(
    user?.role?.toLowerCase().includes("student") ||
    (!user?.department && (!user?.role || user?.role?.toLowerCase().includes("student")))
  );

  // Maintain staff identity across client-side page transitions and notification deep links
  // EXCLUSIVELY for genuine department staff. Explicitly clear if student or non-department staff.
  useEffect(() => {
    if (
      isStudent ||
      !user?.department ||
      ["staff", "student", "admin", "all"].includes(user.department.toLowerCase())
    ) {
      try {
        sessionStorage.removeItem("clearance_staff_department");
        if (user?.userId) {
          sessionStorage.removeItem(`clearance_staff_dept_${user.userId}`);
        }
      } catch {}
      setCachedDept(null);
      return;
    }

    if (
      user?.department &&
      !["staff", "student", "admin", "all"].includes(user.department.toLowerCase())
    ) {
      try {
        sessionStorage.setItem("clearance_staff_department", user.department);
        if (user?.userId) {
          sessionStorage.setItem(`clearance_staff_dept_${user.userId}`, user.department);
        }
        setCachedDept(user.department);
      } catch {}
    }
  }, [user?.department, user?.role, user?.userId, isStudent]);

  // Department names describe assignments; authenticated roles control portal access.
  const effectiveDepartment =
    !isStudent &&
    user?.department &&
    user.department.trim() !== "" &&
    !["staff", "student", "admin", "all"].includes(user.department.toLowerCase())
      ? user.department
      : !isStudent &&
        user?.userId &&
        cachedDept &&
        cachedDept.trim() !== "" &&
        !["staff", "student", "admin", "all"].includes(cachedDept.toLowerCase())
      ? cachedDept
      : undefined;

  const isDepartmentStaff = user?.canAccessDepartment ?? Boolean(effectiveDepartment);
  const prefetchDepartment = usePortalPrefetch("/department/dashboard", isDepartmentStaff);

  // Pre-warm all clearance routes into Client Router Cache on mount
  useEffect(() => {
    router.prefetch("/clearance");
    router.prefetch("/clearance/tasks");
    router.prefetch("/clearance/schedules");
    if (isDepartmentStaff) {
      router.prefetch("/department/clients");
    }
    if (user?.userId) {
      prefetchClearanceData(queryClient, user.userId);
    }
  }, [router, queryClient, user?.userId, isDepartmentStaff]);

  const userName = user?.name || "Jaro, Jose Raphael (C.)";
  const userRole = isDepartmentStaff
    ? (effectiveDepartment ? `${effectiveDepartment} Staff` : "Department Staff")
    : user?.role || "Student";
  const avatarInitials = user?.avatarInitials || "N";

  const navItems = [
    {
      label: "My Clearance",
      href: "/clearance",
      icon: Award,
      isActive: pathname === "/clearance",
    },
    {
      label: "Requirements & Tasks",
      href: "/clearance/tasks",
      icon: FileText,
      isActive: pathname.startsWith("/clearance/tasks"),
    },
    {
      label: "Office Hours",
      href: "/clearance/schedules",
      icon: Clock,
      isActive: pathname.startsWith("/clearance/schedules"),
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
                Clearance Portal
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
          <DropdownMenu onOpenChange={(open) => { if (open) prefetchDepartment(); }}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="group flex w-full items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-emerald-400 transition-ui hover:bg-emerald-950/40 hover:border-emerald-500/50 focus:outline-hidden focus:ring-1 focus:ring-emerald-500/50 cursor-pointer select-none text-left"
                onPointerEnter={prefetchDepartment}
                onFocus={prefetchDepartment}
                onPointerDown={prefetchDepartment}
                aria-label="Switch portal view"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="text-xs font-semibold tracking-wide truncate">
                    Client Clearance
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-emerald-400/80 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="bottom"
              sideOffset={4}
              className="w-(--radix-dropdown-menu-trigger-width) min-w-[200px] border-0 bg-transparent p-0 shadow-2xl shadow-black/90 z-50 rounded-lg overflow-hidden"
            >
              {/* Single Target Entry: Department Staff (Yellow color) */}
              <DropdownMenuItem
                asChild
                className="group flex w-full items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-[#060a14] px-3 py-2 text-amber-400 transition-ui hover:bg-amber-950/40 hover:border-amber-500/50 focus:bg-amber-950/40 focus:border-amber-500/50 focus:text-amber-400 cursor-pointer select-none text-left shadow-lg shadow-black/80 ring-0 outline-hidden"
              >
                <Link href="/department/dashboard" prefetch={true} onClick={() => { if (isMobile) closeMobile(); }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
                    <span className="text-xs font-semibold tracking-wide truncate">
                      Department Staff
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-amber-400/80" />
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-emerald-400 select-none">
            <User className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="text-xs font-semibold tracking-wide truncate">
              Client Clearance
            </span>
          </div>
        )}
      </div>

      {/* ── Navigation Menu (Path-Based Links) ── */}
      <nav className="flex flex-1 flex-col gap-1.5 p-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onMouseEnter={() => {
                router.prefetch(item.href);
                prefetchClearanceData(queryClient, user?.userId);
              }}
              onFocus={() => {
                router.prefetch(item.href);
                prefetchClearanceData(queryClient, user?.userId);
              }}
              onTouchStart={() => {
                router.prefetch(item.href);
                prefetchClearanceData(queryClient, user?.userId);
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
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Sidebar Footer with Logout ── */}
      <div className="border-t border-slate-800/80 p-3">
        <div className="flex items-center justify-between rounded-xl px-2 py-2 transition-colors hover:bg-slate-800/40">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700/80 bg-slate-800/90 text-xs font-bold text-slate-200 shadow-sm">
              {avatarInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-200">
                {userName}
              </p>
              <p className="text-[11px] font-medium text-slate-400">
                {userRole}
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
      <Drawer open={mobileOpen} onClose={closeMobile} title="Clearance navigation" side="left" mobileOnly className="w-72 max-w-[calc(100vw-2rem)] border-r border-slate-800/80 select-none">
        {renderContent(true)}
      </Drawer>
    </>
  );
}
