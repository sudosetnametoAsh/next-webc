import { Courses } from "@/types/courses";
import { useQuery } from "@tanstack/react-query";

export function useFetchCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
    staleTime: 1000 * 60 * 5
  });
}

export async function fetchCourses(): Promise<Courses[]> {
  const response = await fetch(`/api/department/courses`);
  const json = await response.json()
  if (!response.ok) throw new Error("Failed to fetch");
  return json.data;
}
