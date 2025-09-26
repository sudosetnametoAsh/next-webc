import { useQuery } from "@tanstack/react-query";

type Student = {
  clearancetemplates: {
    departments: { dept_name: string };
    staffs?: { staff_name: string };
  };
  status: string;
};

type StudentsResponse = {
  name: string;
  students: Student[];
};

export function useStudents() {
  return useQuery<StudentsResponse>({
    queryKey: ["students"],
    queryFn: async () => {
      const res = await fetch("/api/students");
      const json = await res.json();
      return {
        name: json.name,
        students: json.data, 
      };
    },
  });
}
