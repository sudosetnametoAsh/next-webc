"use client";

import { createClient } from "@/lib/db/supabase-client";
import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateClearanceData } from "@/hooks/clearance/use-clearance-data";

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

    // Finish the current fetch before following up on events received during it.
    // This avoids repeatedly cancelling a slow request during assignment bursts.
    const refresh = async () => {
      if (disposed || refreshing) return;
      refreshing = true;
      try {
        do {
          refreshPending = false;
          await invalidateClearanceData(queryClient, studentId);
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
        () => {
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
      )
      .subscribe((status, error) => {
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
            if (document.visibilityState === "visible") triggerRefresh();
          }, 15000);
        }
      });

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      if (fallback) clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [supabase, studentId, queryClient]);

  return <>{children}</>;
}
