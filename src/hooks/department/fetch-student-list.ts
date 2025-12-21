import { useQuery } from "@tanstack/react-query";

// type Data = {
//   students: Student[]
// }
// type Student = {
//   student_id: string;
//   student_name: string;
// };

type ApiResponse = {
  data: Array<{
    students: {
      student_id: string;
      student_name: string;
    };
  }>;
};

export function useFethStudents(courseId: string) {
  return useQuery<ApiResponse["data"]>({
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
