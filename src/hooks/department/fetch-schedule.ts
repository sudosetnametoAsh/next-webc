import { useQuery } from "@tanstack/react-query";
import { WeeklySchedule } from "@/modules/staff/application/repository/schedule-repository";

export type Schedule = {

  weekly_schedule?: WeeklySchedule | null;
  early_out_date?: string | null;
  staff_name?: string | null;
  dept_name?: string | null;
  icon_name?: string | null;
  floor?: string | null;
  room?: string | null;
};

export function useFetchSchedule() {
  return useQuery<Schedule>({
    queryKey: ["staff-schedule"],
    queryFn: async () => {
      const response = await fetch("/api/department/availability", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch schedule");
      const json = await response.json();
      return json.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
