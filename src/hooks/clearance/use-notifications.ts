import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/db/supabase-client";
import { ClearanceNotification } from "@/types/clearance";

export function useNotifications(userId?: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((n: any) => ({
        id: String(n.notif_id),
        title: n.title,
        description: n.description,
        timestamp: n.created_at,
        type: n.type.toLowerCase() as any,
        read: n.is_read,
        metadata: {
          refUrl: n.ref_url,
          sectionId: n.section_id,
          courseId: n.course_id,
        },
      })) as ClearanceNotification[];
    },
    enabled: !!userId,
  });

  const markAsRead = useMutation({
    mutationFn: async (notifId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("notif_id", parseInt(notifId));

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
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
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
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
