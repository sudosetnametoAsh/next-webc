import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/db/supabase-client";
import { isBottleneckNotification } from "@/lib/notification-visibility";
import { ClearanceNotification } from "@/types/clearance";

export interface UseNotificationsOptions {
  role?: "student" | "department" | "admin";
  departmentId?: number;
}

export function useNotifications(userId?: string, options?: UseNotificationsOptions) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  const role = options?.role || "student";
  const departmentId = options?.departmentId;
  const queryKey = useMemo(
    () => ["notifications", userId, role, departmentId],
    [userId, role, departmentId]
  );

  const { data: notifications = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId && !departmentId && role !== "admin") return [];

      // 1. Try fetching via API route
      try {
        const params = new URLSearchParams();
        if (userId) params.set("userId", userId);
        if (role) params.set("role", role);
        if (departmentId) params.set("departmentId", String(departmentId));

        const res = await fetch(`/api/student/notifications?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.notifications && Array.isArray(json.notifications)) {
            return json.notifications as ClearanceNotification[];
          }
        }
      } catch (e) {
        console.warn("API notifications fetch failed, falling back to direct Supabase query", e);
      }

      // 2. Direct Supabase query fallback
      let query = supabase.from("notifications").select("*");
      if (role === "admin") {
        query = userId
          ? query.or(`target_role.eq.admin,user_id.eq.${userId}`)
          : query.eq("target_role", "admin");
      } else if (role === "department") {
        if (departmentId && userId) {
          query = query.or(
            `user_id.eq.${userId},and(user_id.is.null,department_id.eq.${departmentId}),and(user_id.is.null,department_id.is.null,target_role.eq.department)`
          );
        } else if (departmentId) {
          query = query.or(
            `and(user_id.is.null,department_id.eq.${departmentId}),and(user_id.is.null,department_id.is.null,target_role.eq.department)`
          );
        } else if (userId) {
          query = query.or(
            `user_id.eq.${userId},and(user_id.is.null,department_id.is.null,target_role.eq.department)`
          );
        } else {
          query = query.or(
            `and(user_id.is.null,department_id.is.null,target_role.eq.department)`
          );
        }
      } else {
        query = userId
          ? query.or(`user_id.eq.${userId},and(target_role.eq.student,user_id.is.null)`)
          : query.eq("target_role", "student");
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((n: any) => ({
        id: String(n.notif_id),
        title: n.title,
        description: n.description,
        timestamp: n.created_at,
        type: (n.type || "info").toLowerCase() as any,
        category: n.category || "system",
        targetRole: n.target_role,
        departmentId: n.department_id,
        userId: n.user_id,
        read: Boolean(n.is_read),
        metadata: {
          refUrl: n.ref_url,
          sectionId: n.section_id,
          courseId: n.course_id,
          ...(typeof n.metadata === "object" && n.metadata !== null ? n.metadata : {}),
        },
      })) as ClearanceNotification[];
    },
    // Apply to API responses, direct-query fallback, and previously cached data.
    select: (items: ClearanceNotification[]) => role === "department"
      ? items.filter((notification) => !isBottleneckNotification(notification))
      : items,
    enabled: !!userId || !!departmentId || role === "admin",
    staleTime: 1000 * 30, // 30 seconds fresh window
    refetchInterval: false, // Push-based updates via Supabase Realtime; avoid polling flood
    refetchOnWindowFocus: false, // Prevent request storms on alt-tab/window focus
  });

  // Realtime subscription for instant notification updates with debounced invalidation
  useEffect(() => {
    if (!userId && !departmentId && role !== "admin") return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const triggerDebouncedInvalidate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (userId) {
          queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
        }
        queryClient.invalidateQueries({ queryKey });
        // The clearance layout owns task-data synchronization. Keeping it in
        // one listener avoids competing refetches from the notification UI.
      }, 350);
    };

    const channelId = `notifs-rt-${userId || "all"}-${role}-${departmentId || "0"}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          triggerDebouncedInvalidate();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clearance_records",
        },
        () => {
          triggerDebouncedInvalidate();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clearance_tasks",
        },
        () => {
          triggerDebouncedInvalidate();
        }
      )
      .subscribe();

    const handleCustomUpdate = () => {
      triggerDebouncedInvalidate();
    };
    window.addEventListener("notifications_updated", handleCustomUpdate);

    return () => {
      window.removeEventListener("notifications_updated", handleCustomUpdate);
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [userId, departmentId, role, queryKey, supabase, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (notifId: string) => {
      try {
        await fetch("/api/student/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notifId, userId, role, departmentId }),
        });
      } catch {}

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("notif_id", parseInt(notifId));

      if (error) console.error("Mark as read error:", error);
    },
    onMutate: async (notifId: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ClearanceNotification[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<ClearanceNotification[]>(
          queryKey,
          previous.map((n) => (n.id === notifId ? { ...n, read: true } : n))
        );
      }
      return { previous };
    },
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      }
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const markSectionAsRead = useMutation({
    mutationFn: async (sectionId: string) => {
      if (!userId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("section_id", parseInt(sectionId))
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      }
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      try {
        await fetch("/api/student/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true, userId, role, departmentId }),
        });
      } catch {}

      let updateQuery = supabase.from("notifications").update({ is_read: true });
      if (role === "admin") {
        updateQuery = updateQuery.or(`target_role.eq.admin${userId ? `,user_id.eq.${userId}` : ""}`);
      } else if (role === "department") {
        if (departmentId && userId) {
          updateQuery = updateQuery.or(
            `user_id.eq.${userId},and(user_id.is.null,department_id.eq.${departmentId}),and(user_id.is.null,department_id.is.null,target_role.eq.department)`
          );
        } else if (departmentId) {
          updateQuery = updateQuery.or(
            `and(user_id.is.null,department_id.eq.${departmentId}),and(user_id.is.null,department_id.is.null,target_role.eq.department)`
          );
        } else if (userId) {
          updateQuery = updateQuery.or(
            `user_id.eq.${userId},and(user_id.is.null,department_id.is.null,target_role.eq.department)`
          );
        }
      } else if (userId) {
        updateQuery = updateQuery.eq("user_id", userId);
      }

      const { error } = await updateQuery.eq("is_read", false);
      if (error) console.error("Mark all as read error:", error);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ClearanceNotification[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<ClearanceNotification[]>(
          queryKey,
          previous.map((n) => ({ ...n, read: true }))
        );
      }
      return { previous };
    },
    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
      }
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const unreadBySection = notifications.reduce((acc, n) => {
    const sid = n.metadata?.sectionId;
    if (!n.read && sid !== undefined && sid !== null) {
      const sidStr = String(sid);
      acc[sidStr] = (acc[sidStr] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const unreadByCourse = notifications.reduce((acc, n) => {
    const cid = n.metadata?.courseId;
    if (!n.read && cid !== undefined && cid !== null) {
      const cidStr = String(cid);
      acc[cidStr] = (acc[cidStr] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return {
    notifications,
    isLoading,
    unreadCount,
    unreadBySection,
    unreadByCourse,
    markAsRead,
    markSectionAsRead,
    markAllAsRead,
  };
}
