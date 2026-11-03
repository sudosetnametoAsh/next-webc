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
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { ClearanceNotification } from "@/types/clearance";
import { getNotificationVisual } from "@/lib/notification-icons";

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

export default function AdminNotificationSidebar({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  isLoading = false,
}: NotificationSidebarProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread" | "bottlenecks" | "completions">("all");

  const isBottleneckNotif = (notif: ClearanceNotification) =>
    notif.category === "bottleneck" ||
    (notif.title || "").toLowerCase().includes("bottleneck") ||
    (notif.description || "").toLowerCase().includes("stalled clients");

  const isCompletionNotif = (notif: ClearanceNotification) =>
    notif.category === "clearance" ||
    notif.category === "completion" ||
    (notif.title || "").toLowerCase().includes("completed") ||
    (notif.title || "").toLowerCase().includes("cleared");

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "bottlenecks") return isBottleneckNotif(n);
    if (filter === "completions") return isCompletionNotif(n);
    return true;
  });

  const bottleneckCount = notifications.filter(isBottleneckNotif).length;
  const completionCount = notifications.filter(isCompletionNotif).length;

  const handleNotificationClick = (notif: ClearanceNotification) => {
    if (!notif.read) {
      onMarkAsRead(notif.id);
    }

    onClose();

    const targetUrl = notif.metadata?.refUrl || "/admin/clients";

    // In-place navigation guard: if already on /admin/clients, pushState to prevent redundant RSC server refetches
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin/clients") && targetUrl.startsWith("/admin/clients")) {
      window.history.pushState({}, "", targetUrl);
      return;
    }

    router.push(targetUrl);
  };

  return (
    <Drawer open={isOpen} onClose={onClose} title="Admin notifications" className="w-full max-w-sm sm:max-w-md border-l border-slate-800 bg-[#0a101f] select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#070c18] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-sm">
              <Bell className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-white sm:text-base">
                  Notifications
                </h2>

              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Clearance bottlenecks & completions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">


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
        <div className="flex border-b border-slate-800/80 bg-[#070c18]/40 px-5 py-2.5 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-ui cursor-pointer whitespace-nowrap ${
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
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-ui cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
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
          <button
            type="button"
            onClick={() => setFilter("bottlenecks")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-ui cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              filter === "bottlenecks"
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <AlertTriangle className="h-3 w-3 text-rose-400" />
            Bottlenecks ({bottleneckCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("completions")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-ui cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              filter === "completions"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            Completions ({completionCount})
          </button>
        </div>

        {/* Notification List */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-2.5 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              <p className="mt-3 text-xs text-slate-400">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notif) => {
              const { icon, containerStyle, dotStyle } = getNotificationVisual(notif);
              const targetUrl = notif.metadata?.refUrl || "/admin/clients";
              const canNavigate = Boolean(targetUrl);
              const isBottleneck = isBottleneckNotif(notif);

              const parsedDate = new Date(notif.timestamp);
              const timeString = isNaN(parsedDate.getTime())
                ? "Recently"
                : formatRelativeTime(parsedDate);

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative flex items-start gap-3.5 rounded-xl border p-3.5 transition-ui cursor-pointer ${
                    !notif.read
                      ? "border-slate-700/80 bg-[#070c18] hover:border-amber-500/40 hover:bg-[#0c1427] shadow-xs"
                      : "border-slate-800/50 bg-[#070c18]/40 hover:border-slate-700 hover:bg-[#070c18]/80 opacity-80 hover:opacity-100"
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
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p
                          className={`text-xs font-bold leading-tight transition-colors group-hover:text-amber-300 truncate ${
                            !notif.read ? "text-white" : "text-slate-300"
                          }`}
                        >
                          {notif.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isBottleneck ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-950/40 border border-rose-500/40 text-rose-400">
                            Bottleneck
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-950/40 border border-emerald-500/40 text-emerald-400">
                            Completed
                          </span>
                        )}
                        {!notif.read && (
                          <span className={`h-2 w-2 rounded-full ${dotStyle}`} />
                        )}
                      </div>
                    </div>

                    <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {notif.description}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{timeString}</span>
                      </div>

                      {canNavigate && (
                        <span className="text-[10px] font-semibold text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          View details <ChevronRight className="w-3 h-3 inline" />
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
                {filter === "unread"
                  ? "No unread notifications"
                  : filter === "bottlenecks"
                  ? "No bottleneck alerts"
                  : filter === "completions"
                  ? "No clearance completions"
                  : "No notifications yet"}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-[240px] leading-relaxed">
                {filter === "unread"
                  ? "All caught up! Check back later for clearance updates."
                  : filter === "bottlenecks"
                  ? "No department currently has clients stalled past 24 hours."
                  : filter === "completions"
                  ? "Template completions will appear here as students and staff finish sign-offs."
                  : "Alerts regarding clearance bottlenecks and template completions will appear here."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-800/80 bg-[#070c18] p-3">
          <button
            type="button"
            onClick={onMarkAllAsRead}
            disabled={isLoading || unreadCount === 0}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/50 text-xs font-semibold text-amber-400 transition-colors hover:bg-slate-800 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        </div>
    </Drawer>
  );
}
