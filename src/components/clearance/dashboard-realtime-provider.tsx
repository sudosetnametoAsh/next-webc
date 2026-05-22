"use client";

import { createClient } from "@/lib/db/supabase-client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

export default function DashBoardRealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel("clearance_records_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clearance_records",
        },
        (payload) => {
          console.log("payload received from clearance_records", payload);
          router.refresh();
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
          console.log("payload received from clearance_tasks", payload);
          router.refresh();
        },
      )
      .subscribe((status) => console.log(status));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);
  return <>{children}</>;
}
