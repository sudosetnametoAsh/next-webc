import { Courses } from "@/types/courses";
import { serverFetch } from "./server-fetch";

export async function fetchCourseServer(): Promise<Courses[]> {
  const response = await serverFetch(`/api/department/courses`);
  const json = await response.json();
  if (!response.ok) throw new Error("Failed to fetch");
  return json.data;
}
