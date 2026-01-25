import { useQuery } from "@tanstack/react-query";

type Tasks = {
  status: string;
  clearance_tasks_preset: {
    description: string;
  };
};

type FetchedData = {
  name: string;
  student_id: string;
  students: StudentData[];
  balance: Balance[];
};

type StudentData = {
  clearance_templates: Templates
  status: string;
  student_tasks_status: Tasks[];
};

type Templates = {
  departments: { dept_name: string}
  staffs: { staff_name: string}
}

type Balance = {
  amount: string;
};

export function useFecthRecords() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async (): Promise<FetchedData>=> {
      const result = await fetch("/api/students");
      const json = await result.json();
      return {
        name: json.name,
        students: json.data,
        balance: json.balance,
        student_id: json.student_id,
      };
    },
  });
}
