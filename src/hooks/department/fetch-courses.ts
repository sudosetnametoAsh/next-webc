import { useQuery } from "@tanstack/react-query";

type FetchedData = {
  course_id: number;
  course_name: string;
  students: StudentData[];
};

type StudentData = {
  student_id: string;
  student_name: string;
};

export function useFetchCourses(staffId : string | undefined) {
  return useQuery({
    queryKey: ["courses", staffId],
    queryFn: async (): Promise<FetchedData[]> => {
      const response = await fetch(`/api/department/fetch-courses/${staffId}`);
      const data = await response.json();
      return data.data;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!staffId
  });
}
