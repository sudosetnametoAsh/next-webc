import { useQuery } from "@tanstack/react-query";

type FetchedData = {
  course_id: number;
  course_name: string;
  course_sections: Sections[];
};

type Sections = {
  section_number: number;
  year: number;
  semester: number;
  section_id: number;
};

export function useFetchCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async (): Promise<FetchedData[]> => {
      const response = await fetch(`/api/department/courses`);
      const data = await response.json();
      return data.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
