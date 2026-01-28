import { useQuery } from "@tanstack/react-query";


export type Tasks = {
  status: string;
  clearance_tasks_preset: {
    description: string;
  };
};

export type Templates = {
  departments: { dept_name: string };
  staffs: { staff_name: string };
};

export type StudentData = {
  clearance_templates: Templates;
  status: string;
  student_tasks_status: Tasks[];
};

export type Balance = {
  amount: string; 
};

export type FetchedData = {
  name: string;
  student_id: string;
  students: StudentData[];
  balance: Balance[];
};


export function useFecthRecords() {
  return useQuery({
    queryKey: ["student-records"], 
    
    queryFn: async (): Promise<FetchedData> => {
      const res = await fetch("/api/students");
      
      
      if (!res.ok) {
        throw new Error(`Failed to fetch records: ${res.statusText}`);
      }

      const json = await res.json();

      return {
        name: json.name,
        students: json.data, 
        balance: json.balance,
        student_id: json.student_id,
      };
    },

    // --- Performance Settings ---
    staleTime: 1000 * 60 * 5, 
    refetchOnWindowFocus: false, 
    retry: 1, 
  });
}