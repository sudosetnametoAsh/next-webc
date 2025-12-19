import { useQuery } from "@tanstack/react-query";

type Requirement = {
  status: string;
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
  clearance_templates: Templates
  status: string;
  requirements_status: Requirement[];
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
      };
    },
  });
}
