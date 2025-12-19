import { useQuery } from "@tanstack/react-query";

type FetchedData = {
  course_id: number;
  course_name: string;
  students: StudentData[];
}

type StudentData = {
  student_id: string;
  student_name: string;
}

export function useFetchCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async (): Promise<FetchedData[]> => {
      const response = await fetch("/api/department/fetch-courses");
      const data = await response.json();
      return data.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}