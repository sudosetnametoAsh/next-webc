"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { useRouter } from "next/navigation";
import {
  Bell,
  X,
  CheckCheck,
  ChevronRight,
  Clock,
} from "lucide-react";
import { ClearanceNotification } from "@/types/clearance";
import { getNotificationVisual } from "@/lib/notification-icons";
import {
  getNotificationDirectUrl,
  extractTaskTitleFromDescription,
} from "@/lib/notification-navigation";

interface NotificationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: ClearanceNotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  isLoading?: boolean;
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

export default function NotificationSidebar({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  isLoading = false,
}: NotificationSidebarProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    return true;
  });

  const handleNotificationClick = (notif: ClearanceNotification) => {
    if (!notif.read) {
      onMarkAsRead(notif.id);
    }

    const directUrl = getNotificationDirectUrl(notif);
    if (!directUrl) {
      // Clearance Signed Off: explicitly no view/redirect function
      return;
    }

    onClose();

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

  return (
    <Drawer open={isOpen} onClose={onClose} title="Clearance notifications" className="w-full max-w-sm sm:max-w-md border-l border-portal-border bg-portal-surface select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-portal-border bg-portal-inset px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-sm">
              <Bell className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-portal-foreground sm:text-base">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-400 font-mono">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Clearance updates & requirements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                title="Mark all as read"
                className="flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/50 px-2.5 py-1 text-xs font-semibold text-amber-400 hover:bg-slate-800 hover:text-amber-300 transition-colors cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close notification sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-slate-800/80 bg-[#070c18]/40 px-5 py-2.5 gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-ui cursor-pointer ${
              filter === "all"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-ui cursor-pointer flex items-center gap-1.5 ${
              filter === "unread"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="flex h-1.5 w-1.5 rounded-full bg-rose-500" />
            )}
          </button>
        </div>

        {/* Notification List */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-2.5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              <p className="mt-3 text-xs text-slate-400">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notif) => {
              const { icon, containerStyle, dotStyle } = getNotificationVisual(notif);
              const directUrl = getNotificationDirectUrl(notif);
              const canNavigate = Boolean(directUrl);

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative flex items-start gap-3.5 rounded-xl border p-3.5 transition-ui ${
                    canNavigate ? "cursor-pointer" : "cursor-default"
                  } ${
                    !notif.read
                      ? canNavigate
                        ? "border-slate-700/80 bg-[#070c18] hover:border-amber-500/40 hover:bg-[#0c1427] shadow-xs"
                        : "border-slate-700/80 bg-[#070c18] shadow-xs"
                      : canNavigate
                      ? "border-slate-800/50 bg-[#070c18]/40 hover:border-slate-700 hover:bg-[#070c18]/80 opacity-80 hover:opacity-100"
                      : "border-slate-800/50 bg-[#070c18]/40 opacity-80"
                  }`}
                >
                  {/* Left Icon with dynamic contextual style */}
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${containerStyle}`}
                  >
                    {icon}
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-xs font-bold leading-tight transition-colors ${
                          canNavigate ? "group-hover:text-amber-300" : ""
                        } ${!notif.read ? "text-white" : "text-slate-300"}`}
                      >
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${dotStyle}`} />
                      )}
                    </div>

                    <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.description}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{formatRelativeTime(new Date(notif.timestamp))}</span>
                      </div>

                      {canNavigate && (
                        <span className="text-[10px] font-semibold text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          View <ChevronRight className="w-3 h-3 inline" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 text-slate-500">
                <Bell className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-[240px] leading-relaxed">
                {filter === "unread"
                  ? "All caught up! Check back later for new updates."
                  : "Updates regarding your clearances, requirements, and signatures will appear here."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-portal-border bg-portal-inset p-3 text-center">
          <p className="text-[11px] text-slate-500">
            Clicking a notification navigates directly to the requirement.
          </p>
        </div>
    </Drawer>
  );
}
