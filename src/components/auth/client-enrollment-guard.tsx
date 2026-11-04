"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/db/supabase-client";
import { ENROLLMENT_NOTICE_URL } from "@/lib/auth/client-enrollment";

export default function ClientEnrollmentGuard({ children, userId }: {
  children: React.ReactNode;
  userId?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let disposed = false, checking = false, pending = false, leaving = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    const leave = async (notEnrolled: boolean) => {
      if (disposed || leaving) return;
      leaving = true;
      setLoggingOut(true);
      await queryClient.cancelQueries();
      queryClient.clear();
      try { await supabase.auth.signOut({ scope: "local" }); }
      finally { if (!disposed) window.location.replace(notEnrolled ? ENROLLMENT_NOTICE_URL : "/"); }
    };
    const check = async () => {
      if (disposed || leaving) return;
      if (checking) { pending = true; return; }
      checking = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10000);
      try {
        const response = await fetch("/api/auth/enrollment", { credentials: "include", cache: "no-store", signal: controller.signal });
        if (response.status === 403) {
          const body = await response.json();
          if (body.code === "NOT_ENROLLED") await leave(true);
        } else if (response.status === 401) await leave(false);
      } catch {
        // A network/database outage must not be mistaken for enrollment removal.
      } finally {
        clearTimeout(timeout);
        checking = false;
        if (pending && !disposed && !leaving) { pending = false; trigger(); }
      }
    };
    const trigger = () => {
      if (disposed || leaving || timer) return;
      timer = setTimeout(() => { timer = undefined; void check(); }, 150);
    };
    const onVisible = () => { if (document.visibilityState === "visible") trigger(); };
    const channel = supabase.channel(`enrollment-${userId}`)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "clearance_records" }, trigger)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications" }, trigger)
      .subscribe(() => trigger());
    // DELETE delivery can be missed under RLS/disconnects, including clients with no records.
    const interval = setInterval(onVisible, 15000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !leaving && !disposed) {
        leaving = true;
        setLoggingOut(true);
        queryClient.clear();
        window.location.replace("/");
      }
    });
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    trigger();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      controller?.abort();
      subscription.unsubscribe();
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId, queryClient]);

  return loggingOut ? null : <>{children}</>;
}
