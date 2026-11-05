"use client";

import { APP_TIME_ZONE } from "@/lib/date-time";


import { AnimatedNotificationPopups, useNotificationPopupTimeout } from "@/components/notifications/animated-notification-popups";

import { useState, useMemo, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, X, ChevronRight, Clock } from "lucide-react";
import { useDepartmentNav } from "./department-nav-context";
import { useDepartmentContext } from "@/context/deparment";
import { useNotifications } from "@/hooks/clearance/use-notifications";
import DepartmentNotificationSidebar from "./notification-sidebar";
import { ClearanceNotification } from "@/types/clearance";
import { getNotificationVisual } from "@/lib/notification-icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface HeaderProps {
  title?: string;
  department?: string;
  user_name?: string;
  user_id?: string;
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

export default function DepartmentHeader({ title, department, user_name, user_id }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleMobile } = useDepartmentNav();
  const { userId: contextUserId } = useDepartmentContext();
  const effectiveUserId = user_id || contextUserId;
  const departmentOptions = useMemo(() => ({ role: "department" as const }), []);
  const {
    notifications = [],
    unreadCount = 0,
    markAsRead,
    markAllAsRead,
    isLoading,
  } = useNotifications(effectiveUserId, departmentOptions);

  const [isNotificationSidebarOpen, setIsNotificationSidebarOpen] = useState(false);

  // Active Drop-down Floating Notifications (max 2 items)
  const [activePopups, setActivePopups] = useState<ClearanceNotification[]>([]);
  const shownStorageKey = `department_shown_popups:${effectiveUserId || "anonymous"}`;
  const dismissedStorageKey = `department_dismissed_popups:${effectiveUserId || "anonymous"}`;
  const initialLoadRef = useRef(true);
  const shownPopupIdsRef = useRef<Set<string>>(new Set());
  const dismissedPopupIdsRef = useRef<Set<string>>(new Set());

  // Sync localStorage & sessionStorage on mount
  useEffect(() => {
    initialLoadRef.current = true;
    shownPopupIdsRef.current.clear();
    dismissedPopupIdsRef.current.clear();
    setActivePopups([]);
    try {
      const storedShown =
        localStorage.getItem(shownStorageKey) ||
        sessionStorage.getItem(shownStorageKey);
      if (storedShown) {
        const parsed = JSON.parse(storedShown);
        if (Array.isArray(parsed)) {
          for (const id of parsed) shownPopupIdsRef.current.add(String(id));
        }
      }
      const storedDismissed =
        localStorage.getItem(dismissedStorageKey) ||
        sessionStorage.getItem(dismissedStorageKey);
      if (storedDismissed) {
        const parsed = JSON.parse(storedDismissed);
        if (Array.isArray(parsed)) {
          for (const id of parsed) dismissedPopupIdsRef.current.add(String(id));
        }
      }
    } catch {}
  }, [shownStorageKey, dismissedStorageKey]);

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
        shownPopupIdsRef.current.add(notifIdStr);
      }

      try {
        const shownArr = JSON.stringify(Array.from(shownPopupIdsRef.current));
        localStorage.setItem(shownStorageKey, shownArr);
        sessionStorage.setItem(shownStorageKey, shownArr);
      } catch {}

      if (recentUnread.length > 0) {
        setActivePopups(recentUnread.slice(0, 2));
      }
      return;
    }

    // Subsequent updates: Realtime new incoming notifications
    const newItems: ClearanceNotification[] = [];
    for (const notif of notifications) {
      const notifIdStr = String(notif.id);
      if (notif.read) continue;
      if (dismissedPopupIdsRef.current.has(notifIdStr)) continue;
      if (shownPopupIdsRef.current.has(notifIdStr)) continue;

      newItems.push(notif);
      shownPopupIdsRef.current.add(notifIdStr);
    }

    if (newItems.length > 0) {
      try {
        const shownArr = JSON.stringify(Array.from(shownPopupIdsRef.current));
        localStorage.setItem(shownStorageKey, shownArr);
        sessionStorage.setItem(shownStorageKey, shownArr);
      } catch {}

      setActivePopups((prev) => {
        const combined = [...newItems, ...prev];
        const unique = new Map<string, ClearanceNotification>();
        for (const item of combined) {
          if (!unique.has(item.id)) {
            unique.set(item.id, item);
          }
        }
        return Array.from(unique.values()).slice(0, 2);
      });
    }
  }, [notifications, shownStorageKey]);

  // Instantly remove active popups when their underlying notification is marked as read
  useEffect(() => {
    if (activePopups.length === 0) return;
    const readIds = new Set(
      notifications.filter((n) => n.read).map((n) => String(n.id))
    );
    setActivePopups((prev) => prev.filter((p) => !readIds.has(String(p.id))));
  }, [notifications]);

  // Expiring a popup does not mark the notification as read.
  useNotificationPopupTimeout(activePopups, (id) => {
    const idStr = String(id);
    dismissedPopupIdsRef.current.add(idStr);
    shownPopupIdsRef.current.add(idStr);
    try {
      const disArr = JSON.stringify(Array.from(dismissedPopupIdsRef.current));
      const shownArr = JSON.stringify(Array.from(shownPopupIdsRef.current));
      localStorage.setItem(dismissedStorageKey, disArr);
      sessionStorage.setItem(dismissedStorageKey, disArr);
      localStorage.setItem(shownStorageKey, shownArr);
      sessionStorage.setItem(shownStorageKey, shownArr);
    } catch {}
    setActivePopups((prev) => prev.filter((popup) => popup.id !== id));
  });

  const handleDismissPopup = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const idStr = String(id);
    dismissedPopupIdsRef.current.add(idStr);
    shownPopupIdsRef.current.add(idStr);
    try {
      const disArr = JSON.stringify(Array.from(dismissedPopupIdsRef.current));
      const shownArr = JSON.stringify(Array.from(shownPopupIdsRef.current));
      localStorage.setItem(dismissedStorageKey, disArr);
      sessionStorage.setItem(dismissedStorageKey, disArr);
      localStorage.setItem(shownStorageKey, shownArr);
      sessionStorage.setItem(shownStorageKey, shownArr);
    } catch {}

    markAsRead.mutate(idStr);
    setActivePopups((prev) => prev.filter((p) => String(p.id) !== idStr));
  };

  const handlePopupClick = (notif: ClearanceNotification) => {
    handleDismissPopup(notif.id);

    const title = (notif.title || "").toLowerCase();
    const meta = notif.metadata || {};

    // 0. Personal Clearance Signed Off -> strictly no view/redirect
    if (
      title.includes("clearance signed off") ||
      title.includes("clearance signed") ||
      title === "signed"
    ) {
      return;
    }

    // 0.5. Full Clearance Completed -> View clearance overview & certificate
    if (title.includes("clearance completed") || notif.category === "completion") {
      router.push("/clearance");
      return;
    }

    // 0.7. Personal clearance task or requirement for client view
    if (
      notif.targetRole === "student" &&
      (notif.category === "task" ||
        title.includes("requirement") ||
        title.includes("cleared"))
    ) {
      const taskId = meta.taskId;
      router.push(taskId ? `/clearance/tasks?taskId=${taskId}` : "/clearance/tasks");
      return;
    }

    // 1. Submission flagged for review, appeal, or AI verified document
    if (
      title.includes("flagged") ||
      title.includes("verified") ||
      title.includes("submission") ||
      title.includes("appeal") ||
      notif.category === "submission" ||
      notif.category === "appeal"
    ) {
      const clientId = meta.studentId || meta.clientId || notif.userId;
      const taskId = meta.taskId;
      let targetUrl = "/department/clients?status=submissions";
      if (clientId) targetUrl += `&clientId=${encodeURIComponent(clientId)}`;
      if (taskId) targetUrl += `&taskId=${encodeURIComponent(taskId)}`;

      if (typeof window !== "undefined" && window.location.pathname.startsWith("/department/clients")) {
        window.history.pushState({}, "", targetUrl);
        window.dispatchEvent(
          new CustomEvent("open_department_submission", {
            detail: { clientId, taskId },
          })
        );
        return;
      }

      router.push(targetUrl);
      return;
    }

    // 2. Ready for signing
    if (
      title.includes("ready for signing") ||
      title.includes("signing") ||
      notif.category === "clearance"
    ) {
      const isStaff = meta.type === "staff" || notif.description.includes("Staff");
      if (isStaff) {
        let targetUrl = "/department/clients?type=staff";
        if (meta.staffId || meta.clientId) {
          targetUrl += `&clientId=${encodeURIComponent(meta.staffId || meta.clientId)}`;
        }
        router.push(targetUrl);
        return;
      } else {
        const course = meta.courseName;
        const rawSection = String(meta.sectionId || meta.sectionCode || "");
        const section = rawSection.includes(" ")
          ? rawSection.split(" ").slice(1).join(" ").trim()
          : rawSection.trim();
        let targetUrl = "/department/clients?type=students";
        if (course) targetUrl += `&course=${encodeURIComponent(course)}`;
        if (section) targetUrl += `&section=${encodeURIComponent(section)}`;
        if (meta.studentId || meta.clientId) {
          targetUrl += `&clientId=${encodeURIComponent(meta.studentId || meta.clientId)}`;
        }
        router.push(targetUrl);
        return;
      }
    }

    // Default refUrl fallback
    const targetUrl = meta.refUrl || "/department/clients";
    router.push(targetUrl);
  };

  const handleToggleSidebar = () => {
    setIsNotificationSidebarOpen((prev) => {
      const next = !prev;
      if (next) {
        setActivePopups([]);
      }
      return next;
    });
  };

  // Dynamic title based on current route if not explicitly passed
  const computedTitle =
    title ||
    (pathname.startsWith("/department/dashboard") || pathname === "/department"
      ? "Dashboard"
      : pathname.startsWith("/department/clients")
      ? "Clients"
      : pathname.startsWith("/department/calendar")
      ? "Office Hours"
      : pathname.startsWith("/department/clearance")
      ? "My Clearance"
      : pathname.startsWith("/department/reports")
      ? "Reports & Analytics"
      : "Department Console");

  return (
    <header className="relative z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-[#060a14] px-4 sm:px-6 lg:px-8 select-none">
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
        {/* Notification Bell Anchor Container */}
        <div className="relative">
          <button
            type="button"
            onClick={handleToggleSidebar}
            aria-label="Toggle notification sidebar"
            className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors cursor-pointer ${
              isNotificationSidebarOpen
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <Bell className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-sm ring-2 ring-[#060a14] ">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Dropping Down Pop-up Notifications (Strictly max 2 items) */}
          {!isNotificationSidebarOpen && (
            <AnimatedNotificationPopups
              className="absolute top-full right-0 mt-2 z-40 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] sm:w-96 pointer-events-auto select-none"
            >
              {activePopups.map((notif) => {
                const { icon, containerStyle, dotStyle } = getNotificationVisual(notif);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handlePopupClick(notif)}
                    className="group relative flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-[#0a101f]/95 p-3.5 text-left text-slate-200 shadow-2xl shadow-black/80 backdrop-blur-md transition-ui hover:border-amber-400 hover:bg-[#0c1427] cursor-pointer"
                  >
                    {/* Left Icon with contextual styling */}
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

                    {/* Close 'X' Dismiss Trigger */}
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

        {/* Theme Toggle Indicator (Dark Mode) */}
        <ThemeToggle />
      </div>

      {/* ── Right Notification Sidebar ── */}
      <DepartmentNotificationSidebar
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
