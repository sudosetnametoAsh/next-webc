import { useQuery } from "@tanstack/react-query";

type Clearance = {
  clearance_id: string;
  status: string;
};

type FechedData = {
  student_id: string;
  student_name: string
  student_clearances: Clearance[]
};


export function useFethStudents(courseId: string) {
  return useQuery<FechedData[]>({
    queryKey: ["students", courseId],
    queryFn: async () => {
      const response = await fetch(
        `/api/department/students/${courseId}`,
        {
          credentials: "include",
        }
      );
      const json = await response.json();
      
      return json.data
    },
    enabled: !!courseId,
  });
}
