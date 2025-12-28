import { useQuery } from "@tanstack/react-query";

type Student = {
  student_id: string;
  student_name: string;
};

type Clearance = {
  clearance_id: string;
  students: Student;
};

type FechedData = Clearance[];


export function useFethStudents(courseId: string) {
  return useQuery<FechedData>({
    queryKey: ["students", courseId],
    queryFn: async () => {
      const response = await fetch(
        `/api/department/fetch-students/${courseId}`,
        {
          credentials: "include",
        }
      );
      const json = await response.json();
      return json.data;
    },
    enabled: !!courseId,
  });
}
