import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WeeklySchedule } from "@/modules/staff/application/repository/schedule-repository";

export type UpdateSchedulePayload = {
  weekly_schedule?: WeeklySchedule;
  early_out_date?: string | null;
  action?: "early_out" | "resume_schedule";
};

export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateSchedulePayload) => {
      const response = await fetch("/api/department/availability", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.message || "Failed to update schedule");
      }

      return response.json();
    },
    onError: (error) => toast.error(error.message),
    onSuccess: (_data, payload) => {
      toast.success(payload.action === "early_out" ? "Early out activated" : payload.action === "resume_schedule" ? "Office schedule resumed" : "Office hours saved");
      queryClient.invalidateQueries({ queryKey: ["staff-schedule"] });
    },
  });
}
