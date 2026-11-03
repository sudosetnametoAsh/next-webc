"use client";

import { Drawer } from "@/components/ui/drawer";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Building2,
  BarChart3,
  ShieldCheck,
  LogOut,
  X,
} from "lucide-react";
import AzureSignOutButton from "../auth/azure-sign-out-button";
import { useAdminNav } from "./admin-nav-context";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchAdminStats } from "@/hooks/admin/fetch-stats";
import { prefetchPipelineRadar } from "@/hooks/admin/dashboard";
import { prefetchDepartments } from "@/hooks/admin/departments";
import { prefetchStudentTemplates } from "@/hooks/admin/student-templates";
import { prefetchStaff } from "@/hooks/admin/fetch-staff";

interface AdminSidebarProps {
  user?: {
    name?: string;
    email?: string;
    role?: string;
    avatarInitials?: string;
  };
}

export default function AdminSidebar({ user }: AdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { mobileOpen, closeMobile } = useAdminNav();

  // Pre-warm admin routes and core datasets on mount
  useEffect(() => {
    router.prefetch("/admin/dashboard");
    router.prefetch("/admin/clients");
    router.prefetch("/admin/templates");
    router.prefetch("/admin/departments");
    router.prefetch("/admin/reports");
    prefetchAdminStats(queryClient);
    prefetchPipelineRadar(queryClient);
    prefetchDepartments(queryClient);
    prefetchStudentTemplates(queryClient);
    prefetchStaff(queryClient);
  }, [router, queryClient]);

  const userName = user?.name || "Administrator";
  const userRole = user?.role || "System Admin";
  const avatarInitials = user?.avatarInitials || "A";

  const navItems = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/admin/dashboard" || pathname === "/admin",
    },
    {
      label: "Clients",
      href: "/admin/clients",
      icon: Users,
      isActive: pathname.startsWith("/admin/clients"),
    },
    {
      label: "Templates",
      href: "/admin/templates",
      icon: FileSpreadsheet,
      isActive: pathname.startsWith("/admin/templates"),
    },
    {
      label: "Departments",
      href: "/admin/departments",
      icon: Building2,
      isActive: pathname.startsWith("/admin/departments"),
    },
    {
      label: "Reports",
      href: "/admin/reports",
      icon: BarChart3,
      isActive: pathname.startsWith("/admin/reports"),
    },
  ];

  const renderContent = (isMobile = false) => (
    <div className="flex h-full flex-col">
      {/* ── Brand Header ── */}
      <div className="flex flex-col gap-4 border-b border-portal-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B] font-black text-slate-950 shadow-md shadow-amber-500/20">
              <span className="text-xs font-black tracking-tight">STI</span>
            </div>
            <div className="flex flex-col leading-tight">
                <span className="text-base font-bold tracking-tight text-portal-foreground">
                STI WebC
              </span>
              <span className="text-xs font-medium text-portal-muted">
                Admin Console
              </span>
            </div>
          </div>

          {isMobile && (
            <button
              type="button"
              onClick={closeMobile}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-200"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Role Pill Indicator */}
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-amber-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
          <span className="text-xs font-semibold tracking-wide">
            System Administrator
          </span>
        </div>
      </div>

      {/* ── Navigation Menu (Path-Based Links) ── */}
      <nav className="flex flex-1 flex-col gap-1.5 p-4 overflow-y-auto">
        <span className="mb-1 px-3 text-[11px] font-semibold tracking-wider uppercase text-portal-muted">
          Navigation
        </span>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onMouseEnter={() => {
                router.prefetch(item.href);
                if (item.href === "/admin/clients" || item.href === "/admin/reports") {
                  prefetchStudentTemplates(queryClient);
                  prefetchStaff(queryClient);
                }
              }}
              onFocus={() => {
                router.prefetch(item.href);
                if (item.href === "/admin/clients" || item.href === "/admin/reports") {
                  prefetchStudentTemplates(queryClient);
                  prefetchStaff(queryClient);
                }
              }}
              onTouchStart={() => {
                router.prefetch(item.href);
                if (item.href === "/admin/clients" || item.href === "/admin/reports") {
                  prefetchStudentTemplates(queryClient);
                  prefetchStaff(queryClient);
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
                  ? "border border-portal-border bg-portal-inset text-portal-foreground font-semibold shadow-sm"
                  : "text-portal-muted hover:bg-portal-inset hover:text-portal-foreground font-medium"
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

      {/* ── Sidebar Footer ── */}
      <div className="border-t border-portal-border p-3">
        <div className="flex items-center justify-between rounded-xl px-2 py-2 transition-colors hover:bg-portal-inset">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-portal-border bg-portal-inset text-xs font-bold text-portal-foreground shadow-sm">
              {avatarInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-portal-foreground">
                {userName}
              </p>
              <p className="truncate text-[11px] font-medium text-portal-muted">
                {userRole}
              </p>
            </div>
          </div>
          <AzureSignOutButton color="#94a3b8">
            <span
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-red-400"
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
      <aside className="hidden h-dvh w-64 flex-col border-r border-portal-border bg-portal-surface text-portal-foreground lg:flex lg:w-72 shrink-0 select-none">
        {renderContent(false)}
      </aside>

      {/* ── Mobile Drawer & Backdrop ── */}
      <Drawer open={mobileOpen} onClose={closeMobile} title="Admin navigation" side="left" mobileOnly className="w-72 max-w-[calc(100vw-2rem)] border-r border-slate-800/80 select-none">
        {renderContent(true)}
      </Drawer>
    </>
  );
}
