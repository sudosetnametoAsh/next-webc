import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WeeklySchedule } from "@/modules/staff/application/repository/schedule-repository";

export type UpdateSchedulePayload = {
  time_in?: string;
  time_out?: string;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-schedule"] });
    },
  });
}
