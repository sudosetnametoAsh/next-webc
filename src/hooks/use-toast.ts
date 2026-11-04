"use client";

import { toast } from "sonner";

// Preserve the portals' message/title call convention on the shared toast host.
const success = (message: string, title?: string) =>
  toast.success(title || message, title ? { description: message } : undefined);
const error = (message: string, title?: string) =>
  toast.error(title || message, title ? { description: message } : undefined);

export function useToast() {
  return { success, error };
}
