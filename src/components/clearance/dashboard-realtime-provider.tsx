"use client";

import { createClient } from "@/lib/db/supabase-client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  invalidateClearanceData,
  prefetchClearanceData,
} from "@/hooks/clearance/use-clearance-data";

export default function DashBoardRealtimeProvider({
  children,
  studentId,
}: {
  children: React.ReactNode;
  studentId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-warm clearance cache on mount
  useEffect(() => {
    if (studentId) {
      prefetchClearanceData(queryClient, studentId);
    }
  }, [studentId, queryClient]);

  useEffect(() => {
    // Coalesce rapid bursts of Realtime events (e.g. cascading deletes or bulk task updates)
    // into exactly ONE single cache invalidation and router refresh.
    const triggerRefresh = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        invalidateClearanceData(queryClient, studentId);
        router.refresh();
      }, 400);
    };

    // Scoped Realtime Channel Subscription
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
      .subscribe();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [supabase, router, studentId, queryClient]);

  return <>{children}</>;
}
