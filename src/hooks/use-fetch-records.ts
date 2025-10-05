import { useQuery } from "@tanstack/react-query";

type Records = {
  clearance_templates: {
    departments: { dept_name: string };
    staffs: { staff_name: string };
  };
  status: string;
  requirements_status: Requirement[];
};

type Requirement = {
  status: string;
  clearance_requirements?: {
    description: string;
  };
};

type Balance = {
  amount: string;
};

type FetchedData = {
  name: string;
  students: Records[];
  balance: Balance[];
};

export function useFecthRecords() {
  return useQuery<FetchedData>({
    queryKey: ["students"],
    queryFn: async () => {
      const res = await fetch("/api/students");
      const json = await res.json();
      return {
        name: json.name,
        students: json.data,
        balance: json.balance,
      };
    },
  });
}
