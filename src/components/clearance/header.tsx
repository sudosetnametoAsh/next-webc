"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useNotifications } from "@/hooks/clearance/use-notifications";
import NotificationSidebar from "./notification-sidebar";
import type { ClearanceNotification } from "@/types/clearance";
import { getNotificationVisual } from "@/lib/notification-icons";
import {
  getNotificationDirectUrl,
  extractTaskTitleFromDescription,
} from "@/lib/notification-navigation";
import { useClearanceNav } from "./clearance-nav-context";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface HeaderProps {
  title?: string;
  user?: {
    name?: string;
    email?: string;
    role?: string;
    avatarInitials?: string;
    department?: string;
    userId?: string;
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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getStoredSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const item = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (item) {
      const parsed = JSON.parse(item);
      if (Array.isArray(parsed)) return new Set(parsed.map(String));
    }
  } catch {}
  return new Set<string>();
}

export default function Header({ title, user }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleMobile } = useClearanceNav();

  const [isNotificationSidebarOpen, setIsNotificationSidebarOpen] = useState(false);
  const [activePopups, setActivePopups] = useState<ClearanceNotification[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  const dismissedPopupIdsRef = useRef<Set<string>>(getStoredSet("clearance_dismissed_popups"));
  const shownPopupIdsRef = useRef<Set<string>>(getStoredSet("clearance_shown_popups"));
  const initialLoadRef = useRef(true);

  const effectiveUserId = user?.userId || "02000248919";
  const {
    notifications = [],
    unreadCount = 0,
    markAsRead,
    markAllAsRead,
    isLoading,
  } = useNotifications(effectiveUserId);

  // Sync localStorage & sessionStorage into refs on mount if client-side hydration just completed
  useEffect(() => {
    try {
      const storedShown =
        localStorage.getItem("clearance_shown_popups") ||
        sessionStorage.getItem("clearance_shown_popups");
      if (storedShown) {
        const parsed = JSON.parse(storedShown);
        if (Array.isArray(parsed)) {
          for (const id of parsed) shownPopupIdsRef.current.add(String(id));
        }
      }
      const storedDismissed =
        localStorage.getItem("clearance_dismissed_popups") ||
        sessionStorage.getItem("clearance_dismissed_popups");
      if (storedDismissed) {
        const parsed = JSON.parse(storedDismissed);
        if (Array.isArray(parsed)) {
          for (const id of parsed) dismissedPopupIdsRef.current.add(String(id));
        }
      }
    } catch {}
  }, []);

  // Detect and drop down incoming notifications (strictly max 2 items, no repeat loops)
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      const now = Date.now();
      const recentUnread: ClearanceNotification[] = [];

      const storedViewedPage = getStoredSet(`student_tasks_page_viewed_${effectiveUserId}`);
      const storedViewedDept = getStoredSet(`student_viewed_tasks_${effectiveUserId}`);
      const isTasksPage = Boolean(pathname?.startsWith("/clearance/tasks"));

      for (const notif of notifications) {
        const notifIdStr = String(notif.id);
        const alreadyDismissed = dismissedPopupIdsRef.current.has(notifIdStr);
        const alreadyShown = shownPopupIdsRef.current.has(notifIdStr);

        if (!notif.read && !alreadyDismissed && !alreadyShown) {
          const notifTime = new Date(notif.timestamp).getTime();
          // On initial page entry, only pop up if assigned/created recently (< 5 mins)
          const isRecent = !isNaN(notifTime) && now - notifTime < 5 * 60 * 1000;

          const notifTaskId = notif.metadata?.taskId;
          const isTaskNotification =
            notif.category === "task" ||
            notif.category === "submission" ||
            Boolean(notif.metadata?.refUrl?.includes("/clearance/tasks"));

          const isTaskAlreadyViewed = Boolean(
            notifTaskId &&
              (storedViewedPage.has(String(notifTaskId)) ||
                storedViewedDept.has(String(notifTaskId)) ||
                storedViewedPage.has(`${notifTaskId}_flagged`) ||
                storedViewedPage.has(`${notifTaskId}_rejected`) ||
                storedViewedPage.has(`${notifTaskId}_assigned`))
          );

          // If student is already on the /clearance/tasks page viewing requirements, suppress task popups
          const suppressOnTasksPage = isTasksPage && isTaskNotification;

          if (isRecent && !isTaskAlreadyViewed && !suppressOnTasksPage) {
            recentUnread.push(notif);
          }
        }

        // Mark all current notifications as seen so older unread items don't cascade down
        shownPopupIdsRef.current.add(notifIdStr);
      }

      try {
        const shownArr = JSON.stringify(Array.from(shownPopupIdsRef.current));
        localStorage.setItem("clearance_shown_popups", shownArr);
        sessionStorage.setItem("clearance_shown_popups", shownArr);
      } catch {}

      if (recentUnread.length > 0) {
        setActivePopups(recentUnread.slice(0, 2));
      }
      return;
    }

    // Subsequent updates: Realtime new incoming notifications while already on page
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
        localStorage.setItem("clearance_shown_popups", shownArr);
        sessionStorage.setItem("clearance_shown_popups", shownArr);
      } catch {}

      setActivePopups((prev) => {
        // Prepend fresh items, keep strictly max 2 items, discarding older ones
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
  }, [notifications]);

  // Instantly remove active popups when their underlying notification is marked as read
  useEffect(() => {
    if (activePopups.length === 0) return;
    const readIds = new Set(
      notifications.filter((n) => n.read).map((n) => String(n.id))
    );
    setActivePopups((prev) => prev.filter((p) => !readIds.has(String(p.id))));
  }, [notifications]);

  // Auto-dismiss active popups after 8s unless hovered
  useEffect(() => {
    if (activePopups.length === 0 || isHovered) return;

    const timer = setTimeout(() => {
      setActivePopups((prev) => {
        if (prev.length === 0) return prev;
        const dropped = prev[prev.length - 1];
        if (dropped) {
          const idStr = String(dropped.id);
          dismissedPopupIdsRef.current.add(idStr);
          shownPopupIdsRef.current.add(idStr);
          try {
            const disArr = JSON.stringify(Array.from(dismissedPopupIdsRef.current));
            const shownArr = JSON.stringify(Array.from(shownPopupIdsRef.current));
            localStorage.setItem("clearance_dismissed_popups", disArr);
            sessionStorage.setItem("clearance_dismissed_popups", disArr);
            localStorage.setItem("clearance_shown_popups", shownArr);
            sessionStorage.setItem("clearance_shown_popups", shownArr);
          } catch {}
        }
        return prev.slice(0, -1);
      });
    }, 8000);

    return () => clearTimeout(timer);
  }, [activePopups, isHovered]);

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
      localStorage.setItem("clearance_dismissed_popups", disArr);
      sessionStorage.setItem("clearance_dismissed_popups", disArr);
      localStorage.setItem("clearance_shown_popups", shownArr);
      sessionStorage.setItem("clearance_shown_popups", shownArr);
    } catch {}

    // Mark as read in database
    markAsRead.mutate(idStr);

    // Remove from active banner display immediately
    setActivePopups((prev) => prev.filter((p) => String(p.id) !== idStr));
  };

  const handlePopupClick = (notif: ClearanceNotification) => {
    handleDismissPopup(notif.id);

    const directUrl = getNotificationDirectUrl(notif);
    if (!directUrl) {
      // Clearance Signed Off: explicitly no view/redirect function
      return;
    }

    const isTasksTarget = directUrl.includes("/clearance/tasks");
    const isCurrentlyOnTasks =
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/clearance/tasks");

    const taskId = notif.metadata?.taskId;
    const taskTitle =
      notif.metadata?.taskTitle || extractTaskTitleFromDescription(notif.description);

    // 1. If currently on /clearance/tasks, open immediately in-place with zero network requests
    if (isTasksTarget && isCurrentlyOnTasks) {
      window.history.pushState({}, "", directUrl);
      window.dispatchEvent(
        new CustomEvent("open_task_modal", {
          detail: { taskId, taskTitle },
        })
      );
      return;
    }

    // 2. If currently on /clearance/schedules and target is /clearance/schedules, do nothing
    if (
      directUrl.includes("/clearance/schedules") &&
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/clearance/schedules")
    ) {
      return;
    }

    // 3. If navigating to /clearance/tasks from another route (/clearance, /clearance/schedules),
    // use the cached base route so Next.js client router cache resolves it instantly with 0 server roundtrips!
    if (isTasksTarget) {
      if (taskId || taskTitle) {
        try {
          sessionStorage.setItem(
            "pending_open_task",
            JSON.stringify({ taskId, taskTitle, url: directUrl })
          );
        } catch {}
      }
      router.push("/clearance/tasks");
      return;
    }

    router.push(directUrl);
  };

  const handleToggleSidebar = () => {
    setIsNotificationSidebarOpen((prev) => {
      const next = !prev;
      if (next) {
        // Close floating popups when opening the full sidebar
        setActivePopups([]);
      }
      return next;
    });
  };

  // Dynamic title based on current path if not explicitly provided
  const computedTitle =
    title ||
    (pathname.startsWith("/clearance/tasks")
      ? "Requirements & Tasks"
      : pathname.startsWith("/clearance/schedules")
      ? "Department Schedules"
      : "My Clearance");

  return (
    <header className="relative z-30 flex h-16 w-full items-center justify-between border-b border-portal-border bg-portal-canvas px-4 sm:px-6 lg:px-8 select-none">
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

        <h1 className="text-sm font-semibold tracking-tight text-portal-foreground sm:text-base">
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
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-sm ring-2 ring-portal-canvas ">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Dropping Down Pop-up Notifications (Strictly max 2 items) */}
          {activePopups.length > 0 && !isNotificationSidebarOpen && (
            <div
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="absolute top-full right-0 mt-2 z-40 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] sm:w-96 pointer-events-auto animate-in ease-out fade-in slide-in-from-top-2 duration-200 select-none"
            >
              {activePopups.map((notif) => {
                const { icon, containerStyle, dotStyle } = getNotificationVisual(notif);
                const directUrl = getNotificationDirectUrl(notif);
                const canNavigate = Boolean(directUrl);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handlePopupClick(notif)}
                    className={`group relative flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-portal-surface/95 p-3.5 text-left text-portal-foreground shadow-2xl shadow-black/80 backdrop-blur-md transition-ui ${
                      canNavigate
                        ? "hover:border-amber-400 hover:bg-[#0c1427] cursor-pointer"
                        : "cursor-default"
                    }`}
                  >
                    {/* Left Icon with contextual styling */}
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${containerStyle}`}
                    >
                      {icon}
                    </div>

                    <div className="min-w-0 flex-1 pr-6">
                      <div className="flex items-center gap-1.5">
                        <p
                          className={`text-xs font-bold text-portal-foreground transition-colors truncate ${
                            canNavigate ? "group-hover:text-amber-300" : ""
                          }`}
                        >
                          {notif.title}
                        </p>
                        <span className={`flex h-1.5 w-1.5 rounded-full shrink-0 ${dotStyle}`} />
                      </div>
                      <p className="mt-0.5 text-xs text-portal-muted line-clamp-2 leading-relaxed">
                        {notif.description}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatRelativeTime(new Date(notif.timestamp))}
                        </span>
                        {canNavigate && (
                          <span className="text-[10px] font-semibold text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            View details <ChevronRight className="w-3 h-3 inline" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dismiss Button (X) */}
                    <button
                      type="button"
                      onClick={(e) => handleDismissPopup(notif.id, e)}
                      title="Dismiss notification"
                      className="absolute top-2.5 right-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4 pointer-events-none" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Theme Toggle (Dark Mode Indicator) */}
        <ThemeToggle />
      </div>

      {/* ── Right Notification Sidebar ── */}
      <NotificationSidebar
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
