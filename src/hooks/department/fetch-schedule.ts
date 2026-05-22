import { useQuery } from "@tanstack/react-query";

export type Schedule = {
  time_in: string | null;
  time_out: string | null;
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
