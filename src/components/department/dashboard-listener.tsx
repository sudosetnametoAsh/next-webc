"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db/supabase-client";
import { useQueryClient } from "@tanstack/react-query";

export default function RealtimeDashboardListener() {
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
          // Include the section and staff lists used by the department context.
          await Promise.all(["department-clients", "department-dashboard", "clients", "staff-clearance", "client-tasks", "department-client-progress"].map(
            (key) => queryClient.invalidateQueries({ queryKey: [key] }),
          ));
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

    const channel = supabase.channel("department-realtime-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "academic_periods" }, triggerRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "clearance_records" }, triggerRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "clearance_tasks" }, triggerRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, triggerRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "clearance_templates" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["courses"] });
        triggerRefresh();
      })
      .subscribe((status, error) => {
        if (disposed) return;
        if (status === "SUBSCRIBED") {
          if (fallback) clearInterval(fallback);
          fallback = undefined;
          triggerRefresh();
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          console.warn("Department realtime disconnected:", status, error);
          triggerRefresh();
          fallback ??= setInterval(onVisible, 15000);
        }
      });

    window.addEventListener("department_data_invalidated", triggerRefresh);
    window.addEventListener("online", triggerRefresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      if (fallback) clearInterval(fallback);
      window.removeEventListener("department_data_invalidated", triggerRefresh);
      window.removeEventListener("online", triggerRefresh);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [supabase, router, queryClient]);

  return null;
}
