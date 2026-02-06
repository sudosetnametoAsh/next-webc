import { useQuery } from "@tanstack/react-query";

type Task = {
  description: string;
  task_id: string;
};

type StaffData = {
  staff_id: string;
  staff_name: string;
  departments: {
    dept_name: string;
  };
  clearance_tasks_preset: Task[];
};

export function useFetchStaffData() {
  return useQuery<StaffData[]>({
    queryKey: ["staff"],
    queryFn: async () => {
      const response = await fetch("/api/department/fetch-staff", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch staff data");
      }

      const json = await response.json();
      return json.data;
    },
  });
}
