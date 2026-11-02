"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db/supabase-client";
import { useQueryClient } from "@tanstack/react-query";

export default function RealtimeDashboardListener() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const lastRefreshTimeRef = useRef<number>(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const triggerRefresh = () => {
      // 1. Instantly invalidate TanStack Query caches
      queryClient.invalidateQueries({ queryKey: ["department-clients"] });
      queryClient.invalidateQueries({ queryKey: ["department-dashboard"] });

      // 2. Throttle router.refresh to keep Next.js Server Components in sync
      const now = Date.now();
      if (now - lastRefreshTimeRef.current < 3000) {
        return;
      }

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      refreshTimeoutRef.current = setTimeout(() => {
        lastRefreshTimeRef.current = Date.now();
        router.refresh();
      }, 500);
    };

    const channel = supabase
      .channel("department-realtime-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clearance_records" },
        () => {
          triggerRefresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clearance_tasks" },
        () => {
          triggerRefresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clearance_logs" },
        () => {
          triggerRefresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clearance_templates" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["courses"] });
          triggerRefresh();
        }
      )
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [supabase, router, queryClient]);

  return null;
}
