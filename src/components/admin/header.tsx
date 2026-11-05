"use client";

import { APP_TIME_ZONE } from "@/lib/date-time";


import { AnimatedNotificationPopups, useNotificationPopupTimeout } from "@/components/notifications/animated-notification-popups";

import { useState, useMemo, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, X, ChevronRight, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { useAdminNav } from "./admin-nav-context";
import { useNotifications } from "@/hooks/clearance/use-notifications";
import AdminNotificationSidebar from "./notification-sidebar";
import { ClearanceNotification } from "@/types/clearance";
import { getNotificationVisual } from "@/lib/notification-icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface HeaderProps {
  title?: string;
  user?: {
    name?: string;
    email?: string;
    role?: string;
    avatarInitials?: string;
  };
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString("en-US", { timeZone: APP_TIME_ZONE, month: "short", day: "numeric" });
}

export default function AdminHeader({ title, user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleMobile } = useAdminNav();

  const adminOptions = useMemo(() => ({ role: "admin" as const }), []);
  const {
    notifications = [],
    unreadCount = 0,
    markAsRead,
    markAllAsRead,
    isLoading,
  } = useNotifications(undefined, adminOptions);

  const [isNotificationSidebarOpen, setIsNotificationSidebarOpen] = useState(false);

  // Active Drop-down Floating Notifications (max 2 items)
  const [activePopups, setActivePopups] = useState<ClearanceNotification[]>([]);
  const initialLoadRef = useRef(true);
  const shownPopupIdsRef = useRef<Set<string>>(new Set());
  const dismissedPopupIdsRef = useRef<Set<string>>(new Set());

  // Sync localStorage & sessionStorage on mount
  useEffect(() => {
    try {
      const storedShown =
        localStorage.getItem("admin_shown_popups") ||
        sessionStorage.getItem("admin_shown_popups");
      if (storedShown) {
        const parsed = JSON.parse(storedShown);
        if (Array.isArray(parsed)) {
          for (const id of parsed) shownPopupIdsRef.current.add(String(id));
        }
      }
      const storedDismissed =
        localStorage.getItem("admin_dismissed_popups") ||
        sessionStorage.getItem("admin_dismissed_popups");
      if (storedDismissed) {
        const parsed = JSON.parse(storedDismissed);
        if (Array.isArray(parsed)) {
          for (const id of parsed) dismissedPopupIdsRef.current.add(String(id));
        }
      }
    } catch {}
  }, []);

  // Detect and drop down incoming notifications (strictly max 2 items)
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      const now = Date.now();
      const recentUnread: ClearanceNotification[] = [];

      for (const notif of notifications) {
        const notifIdStr = String(notif.id);
        const alreadyDismissed = dismissedPopupIdsRef.current.has(notifIdStr);
        const alreadyShown = shownPopupIdsRef.current.has(notifIdStr);

        if (!notif.read && !alreadyDismissed && !alreadyShown) {
          const notifTime = new Date(notif.timestamp).getTime();
          const isRecent = !isNaN(notifTime) && now - notifTime < 5 * 60 * 1000;
          if (isRecent) {
            recentUnread.push(notif);
          }
        }
      }

      if (recentUnread.length > 0) {
        const toShow = recentUnread.slice(0, 2);
        setActivePopups(toShow);
        toShow.forEach((n) => shownPopupIdsRef.current.add(String(n.id)));
        try {
          localStorage.setItem(
            "admin_shown_popups",
            JSON.stringify(Array.from(shownPopupIdsRef.current))
          );
        } catch {}
      }
      return;
    }

    // Subsequent updates: detect new unread notifications
    const newItems: ClearanceNotification[] = [];
    for (const notif of notifications) {
      const notifIdStr = String(notif.id);
      const isDismissed = dismissedPopupIdsRef.current.has(notifIdStr);
      const isAlreadyShown = shownPopupIdsRef.current.has(notifIdStr);

      if (!notif.read && !isDismissed && !isAlreadyShown) {
        newItems.push(notif);
        shownPopupIdsRef.current.add(notifIdStr);
      }
    }

    if (newItems.length > 0) {
      try {
        localStorage.setItem(
          "admin_shown_popups",
          JSON.stringify(Array.from(shownPopupIdsRef.current))
        );
      } catch {}

      setActivePopups((prev) => {
        const combined = [...newItems, ...prev];
        const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
        return unique.slice(0, 2);
      });
    }
  }, [notifications]);

  // Immediately evict notifications that are read
  useEffect(() => {
    if (activePopups.length === 0) return;
    const unreadIds = new Set(notifications.filter((n) => !n.read).map((n) => String(n.id)));
    setActivePopups((prev) => prev.filter((p) => unreadIds.has(String(p.id))));
  }, [notifications, activePopups.length]);

  // Expiring a popup does not mark the notification as read.
  useNotificationPopupTimeout(activePopups, (id) => {
    dismissedPopupIdsRef.current.add(String(id));
    try {
      localStorage.setItem("admin_dismissed_popups", JSON.stringify(Array.from(dismissedPopupIdsRef.current)));
    } catch {}

    setActivePopups((prev) => prev.filter((popup) => popup.id !== id));
  });

  const handleDismissPopup = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    dismissedPopupIdsRef.current.add(String(id));
    try {
      localStorage.setItem(
        "admin_dismissed_popups",
        JSON.stringify(Array.from(dismissedPopupIdsRef.current))
      );
    } catch {}
    setActivePopups((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePopupClick = (notif: ClearanceNotification) => {
    handleDismissPopup(notif.id);
    if (!notif.read) {
      markAsRead.mutate(notif.id);
    }
    const refUrl = notif.metadata?.refUrl || "/admin/clients";
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin/clients") && refUrl.startsWith("/admin/clients")) {
      window.history.pushState({}, "", refUrl);
      return;
    }
    router.push(refUrl);
  };

  // Dynamic title based on current path if not explicitly provided
  const computedTitle =
    title ||
    (pathname.startsWith("/admin/dashboard") || pathname === "/admin"
      ? "Dashboard"
      : pathname.startsWith("/admin/clients")
      ? "Clients"
      : pathname.startsWith("/admin/courses")
      ? "Course Management"
      : pathname.startsWith("/admin/templates")
      ? "Clearance Templates"
      : pathname.startsWith("/admin/departments")
      ? "Departments"
      : pathname.startsWith("/admin/academic-periods")
      ? "Academic Periods"
      : pathname.startsWith("/admin/reports")
      ? "Reports & Analytics"
      : pathname.startsWith("/admin/simulation")
      ? "Simulation Suite"
      : "Admin Console");

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-[#060a14] px-4 sm:px-6 lg:px-8 select-none">
      {/* ── Left: Mobile Menu Trigger + Breadcrumb Title ── */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger icon */}
        <button
          type="button"
          onClick={toggleMobile}
          aria-label="Toggle navigation"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-200 lg:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="text-sm font-semibold tracking-tight text-white sm:text-base">
          {computedTitle}
        </h1>
      </div>

      {/* ── Right: Utilities (Notifications, Theme Toggle) ── */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Bell with Number Badge */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationSidebarOpen((prev) => !prev)}
            aria-label="Toggle notification sidebar"
            className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors cursor-pointer ${
              isNotificationSidebarOpen
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <Bell className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-sm ring-2 ring-[#060a14]  font-mono">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Active Dropdown Popups for Admin Alerts */}
          {!isNotificationSidebarOpen && (
            <AnimatedNotificationPopups
              className="absolute right-0 top-12 z-50 flex w-80 max-w-[calc(100vw-2rem)] sm:w-96 flex-col gap-2"
            >
              {activePopups.map((notif) => {
                const { icon, containerStyle, dotStyle } = getNotificationVisual(notif);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handlePopupClick(notif)}
                    className="group relative flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-[#0a101f]/95 p-3.5 text-left text-slate-200 shadow-2xl shadow-black/80 backdrop-blur-md transition-ui hover:border-amber-400 hover:bg-[#0c1427] cursor-pointer"
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${containerStyle}`}
                    >
                      {icon}
                    </div>

                    <div className="min-w-0 flex-1 pr-6">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${dotStyle}`} />
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                          {notif.title}
                        </h4>
                      </div>

                      <p className="mt-1 text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {notif.description}
                      </p>

                      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {formatRelativeTime(new Date(notif.timestamp))}
                        </span>
                        <span className="text-amber-400/90 font-semibold flex items-center gap-0.5 group-hover:underline">
                          View details
                          <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDismissPopup(notif.id, e)}
                      aria-label="Dismiss notification"
                      className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </AnimatedNotificationPopups>
          )}
        </div>

        {/* Theme Toggle Indicator (Dark Mode Moon Icon) */}
        <ThemeToggle />
      </div>

      {/* ── Right Notification Sidebar ── */}
      <AdminNotificationSidebar
        isOpen={isNotificationSidebarOpen}
        onClose={() => setIsNotificationSidebarOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={(id) => markAsRead.mutate(id)}
        onMarkAllAsRead={() => markAllAsRead.mutate()}
        isLoading={isLoading}
      />
    </header>
  );
}
