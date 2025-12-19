import { useQuery } from "@tanstack/react-query";

type Student = {
  student_id: string;
  student_name: string;
};
export function useFethStudents(courseId: string) {
  return useQuery<Student[]>({
    queryKey: ["students", courseId],
    queryFn: async () => {
      const response = await fetch(
        `/api/department/fetch-students/${courseId}`,
        {
          credentials: "include",
        }
      );
      const json = await response.json();
      return json.data[0].students;
    },
    enabled: !!courseId,
  });
}
