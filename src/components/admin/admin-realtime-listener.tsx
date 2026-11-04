"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db/supabase-client";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminRealtimeListener() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let fallback: ReturnType<typeof setInterval> | undefined;
    let refreshing = false;
    let pending = false;

    const refresh = async () => {
      if (disposed || refreshing) return;
      refreshing = true;
      try {
        do {
          pending = false;
          await Promise.all([
            "stats", "pipeline-radar", "activity", "departments", "student-templates",
            "course-templates", "staff-templates", "staff", "courses",
          ].map((key) => queryClient.invalidateQueries({ queryKey: ["admin", key] })));
        } while (pending && !disposed);
        if (!disposed) router.refresh();
      } finally {
        refreshing = false;
      }
    };
    const triggerRefresh = () => {
      if (disposed) return;
      pending = true;
      if (timer || refreshing) return;
      timer = setTimeout(() => {
        timer = undefined;
        void refresh();
      }, 200);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") triggerRefresh();
    };

    const channel = supabase.channel("admin-realtime-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "clearance_records" }, triggerRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "clearance_tasks" }, triggerRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "clearance_departments" }, triggerRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "clearance_templates" }, triggerRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "clearance_logs" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["admin", "activity"] });
      })
      .subscribe((status, error) => {
        if (disposed) return;
        if (status === "SUBSCRIBED") {
          if (fallback) clearInterval(fallback);
          fallback = undefined;
          triggerRefresh();
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          console.warn("Admin realtime disconnected:", status, error);
          triggerRefresh();
          fallback ??= setInterval(onVisible, 15000);
        }
      });

    window.addEventListener("admin_data_invalidated", triggerRefresh);
    window.addEventListener("online", triggerRefresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      if (fallback) clearInterval(fallback);
      window.removeEventListener("admin_data_invalidated", triggerRefresh);
      window.removeEventListener("online", triggerRefresh);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [supabase, router, queryClient]);

  return null;
}
