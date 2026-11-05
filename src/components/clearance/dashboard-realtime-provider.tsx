"use client";

import { createClient } from "@/lib/db/supabase-client";
import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { applyTaskEdit } from "@/lib/clearance-task-sync";
import { clearanceQueryKeys, invalidateClearanceData, type ClearanceDataResponse } from "@/hooks/clearance/use-clearance-data";

export default function DashBoardRealtimeProvider({
  children,
  studentId,
}: {
  children: React.ReactNode;
  studentId?: string;
}) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  useEffect(() => {
    if (!studentId) return;

    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let fallback: ReturnType<typeof setInterval> | undefined;
    let refreshing = false;
    let refreshPending = false;
    const pendingTaskEdits = new Map<number, Record<string, unknown>>();
    const applyPendingEdits = () => {
      if (!pendingTaskEdits.size) return;
      queryClient.setQueryData<ClearanceDataResponse>(clearanceQueryKeys.student(studentId), bundle => {
        for (const row of pendingTaskEdits.values()) bundle = applyTaskEdit(bundle, row);
        return bundle;
      });
    };

    // Finish the current fetch before following up on events received during it.
    // This avoids repeatedly cancelling a slow request during assignment bursts.
    const refresh = async () => {
      if (disposed || refreshing) return;
      refreshing = true;
      try {
        do {
          refreshPending = false;
          await invalidateClearanceData(queryClient, studentId);
          // An older in-flight response must not undo an edit received during it.
          applyPendingEdits();
          if (!refreshPending) pendingTaskEdits.clear();
        } while (refreshPending && !disposed);
      } finally {
        refreshing = false;
      }
    };

    const triggerRefresh = () => {
      if (disposed) return;
      refreshPending = true;
      // Bound the batching delay: new events must not keep postponing a refresh.
      if (timer || refreshing) return;
      timer = setTimeout(() => {
        timer = undefined;
        void refresh();
      }, 200);
    };

    // RLS determines which changes this authenticated user can receive.
    const channelId = `clearance-rt-${studentId || "default"}-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "academic_periods" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["clearance", "history"] });
        triggerRefresh();
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clearance_records",
        },
        () => {
          triggerRefresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clearance_tasks",
        },
        (payload) => {
          if (payload.eventType === "UPDATE" && typeof payload.new.assigned_task_id === "number") {
            pendingTaskEdits.set(payload.new.assigned_task_id, payload.new);
            applyPendingEdits();
          }
          triggerRefresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          triggerRefresh();
        },
      );

    const onStatus = (status: string, error?: Error) => {
      if (disposed) return;
      if (status === "SUBSCRIBED") {
        if (fallback) clearInterval(fallback);
        fallback = undefined;
        // Catch changes made before subscribing or while disconnected.
        triggerRefresh();
      } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
        console.warn("Clearance realtime disconnected:", status, error);
        triggerRefresh();
        // Keep an open portal usable while the realtime client reconnects.
        fallback ??= setInterval(() => {
          if (document.visibilityState === "visible") { triggerRefresh(); void subscribe(); }
        }, 15000);
      }
    };
    let started = false;
    let authenticating = false;
    const subscribe = async () => {
      if (disposed || started || authenticating) return;
      authenticating = true;
      try {
        // Wait for the user JWT; do not join as anon and hope it is corrected later.
        await supabase.realtime.setAuth();
        if (!disposed) { started = true; channel.subscribe(onStatus); }
      } catch {
        if (!disposed) onStatus("CHANNEL_ERROR", new Error("Unable to authenticate clearance realtime"));
      } finally { authenticating = false; }
    };
    void subscribe();

    const onVisible = () => { if (document.visibilityState === "visible") { triggerRefresh(); void subscribe(); } };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      disposed = true;
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      if (timer) clearTimeout(timer);
      if (fallback) clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [supabase, studentId, queryClient]);

  return <>{children}</>;
}
