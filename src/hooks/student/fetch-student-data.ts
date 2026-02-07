import { useQuery } from "@tanstack/react-query";

type Tasks = {
  assigned_task_id: string;
  status: string;
  dropbox: string;
  clearance_tasks_preset: {
    description: string;
  };
};

type FetchedData = {
  name: string;
  students: StudentData[];
  balance: Balance[];
};

type StudentData = {
  clearance_id: string;
  student_id: string;
  status: string;
  clearance_templates: Templates;
  assigned_tasks: Tasks[];
};

type Templates = {
  departments: { dept_name: string };
  staffs: { staff_name: string };
};

type Balance = {
  amount: string;
};

export function useFecthRecords() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async (): Promise<FetchedData> => {
      const result = await fetch("/api/student");
      const json = await result.json();
      return {
        name: json.name,
        students: json.data,
        balance: json.balance,
      };
    },
  });
}
