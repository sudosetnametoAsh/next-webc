"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db/supabase-client";


export default function RealtimeDashboardListener() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Listen to changes on the tables that affect your dashboard
    const channel = supabase
      .channel("dashboard-changes")
      // Listen to clearances
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clearance_records" },
        (payload) => {
          console.log("Clearance changed:", payload);
          router.refresh(); // Tells Next.js to re-run the Server Component fetch
        }
      )
      // Listen to tasks
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clearance_tasks" },
        (payload) => {
          console.log("Task changed:", payload);
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clearance_logs" },
        (payload) => {
          console.log("Task changed:", payload);
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  return null; // This component is invisible
}
