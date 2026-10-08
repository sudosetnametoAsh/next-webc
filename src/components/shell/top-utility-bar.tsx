"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, ChevronRight, Bell, LogOut, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AzureSignOutButton from "@/components/auth/azure-sign-out-button";
import { useNotifications } from "@/hooks/clearance/use-notifications";
import { getInitials } from "./role-sidebar";
import { cn } from "@/lib/utils";
import ThemeToggle from "./theme-toggle";

export interface TopUtilityBarProps {
  session: {
    user_id?: string;
    user_name: string;
    user_email: string;
    role: string;
    department?: string;
  };
  onOpenMobileMenu: () => void;
}

const segmentLabels: Record<string, string> = {
  admin: "Admin Workspace",
  department: "Faculty Hub",
  student: "Student Portal",
  dashboard: "Dashboard",
  students: "Students",
  templates: "Templates",
  reports: "Reports",
  clients: "Client Queue",
  clearance: "Staff Clearance",
  tasks: "Requirements & Tasks",
  offices: "Department Schedules",
  settings: "Settings",
  profile: "Profile",
};

function formatSegment(seg: string): string {
  if (segmentLabels[seg.toLowerCase()]) {
    return segmentLabels[seg.toLowerCase()];
  }
  return seg
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function DynamicBreadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const segments = pathname.split("/").filter(Boolean);

  interface BreadcrumbItem {
    label: string;
    href: string;
  }

  const items: BreadcrumbItem[] = [];

  let accumulatedPath = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    accumulatedPath += `/${seg}`;

    let label = formatSegment(seg);

    // If on student page, refine based on tab query
    if (seg === "student" && i === segments.length - 1) {
      const tab = searchParams.get("tab");
      if (tab === "tasks") {
        label = "Requirements & Tasks";
      } else if (tab === "offices") {
        label = "Department Schedules";
      } else {
        label = "My Clearance";
      }
    }

    items.push({
      label,
      href: accumulatedPath,
    });
  }

  if (items.length === 0) {
    items.push({ label: "Portal", href: "/" });
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs sm:text-sm font-medium">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={item.href + index}>
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />}
            {isLast ? (
              <span className="text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[140px] sm:max-w-xs">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors truncate max-w-[120px]"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function NotificationsMenu({ userId }: { userId?: string }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-amber-500 rounded-full shadow-xs animate-in zoom-in-75 duration-150">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-lg border-slate-200 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</h4>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllAsRead.mutate()}
              className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No notifications at this time
            </div>
          ) : (
            notifications.slice(0, 10).map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.read) markAsRead.mutate(n.id);
                }}
                className={cn(
                  "p-3 text-xs transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60",
                  !n.read ? "bg-amber-50/40 dark:bg-amber-950/20" : "bg-white dark:bg-slate-900"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{n.title}</span>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {n.description}
                </p>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                  {new Date(n.timestamp).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TopUtilityBar({ session, onOpenMobileMenu }: TopUtilityBarProps) {
  const initials = getInitials(session.user_name);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-100 border-b border-slate-200/80 shadow-xs shrink-0 select-none">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Suspense fallback={<div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />}>
          <DynamicBreadcrumbs />
        </Suspense>
      </div>

      {/* Right: Utilities */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Notifications */}
        <NotificationsMenu userId={session.user_id} />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Initials & Profile Chip */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div
            className="w-8 h-8 rounded-full bg-[#0B192C] text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-500/30 shadow-xs shrink-0"
            title={`${session.user_name} (${session.role})`}
          >
            {initials}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[130px]">
              {session.user_name}
            </span>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight truncate max-w-[130px]">
              {session.department
                ? `${session.role} • ${session.department}`
                : session.role}
            </span>
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="pl-1">
          <AzureSignOutButton
            className="p-2 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-100/70 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/40 transition-colors cursor-pointer flex items-center justify-center"
            color="currentColor"
          >
            <LogOut className="w-4 h-4" />
          </AzureSignOutButton>
        </div>
      </div>
    </header>
  );
}

export default TopUtilityBar;
