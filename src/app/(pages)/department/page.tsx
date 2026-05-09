import DepartmentContainer from "@/components/department/department-container";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { fetchCourseServer } from "@/lib/api/courses";
import { fetchStudentsServer } from "@/lib/api/students";
import TaskView from "@/components/department/students/task-view";

export default async function Department() {
  const queryClient = new QueryClient();

  const courses = await fetchCourseServer();
  const initialSectionId = String(courses[0].course_sections[0].section_id);

  await queryClient.prefetchQuery({
    queryKey: ["courses"],
    queryFn: fetchCourseServer,
  });

  await queryClient.prefetchQuery({
    queryKey: ["students", initialSectionId],
    queryFn: () => fetchStudentsServer(initialSectionId),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {/* <DepartmentContainer /> */}
      {/* <TaskView /> */}
      <p>hello world</p>
    </HydrationBoundary>
  );
}
