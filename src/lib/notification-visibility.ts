/** Identify current and legacy bottleneck alerts without relying on their recipient. */
export function isBottleneckNotification(notification: {
  title?: string | null;
  category?: string | null;
  metadata?: Record<string, unknown> | null;
}): boolean {
  return notification.category?.toLowerCase() === "bottleneck"
    || notification.title?.toLowerCase().includes("bottleneck") === true
    || notification.metadata?.type === "bottleneck";
}
