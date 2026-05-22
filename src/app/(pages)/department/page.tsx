import DepartmentContainer from "@/components/department/department-container";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { fetchCourseServer } from "@/lib/api/courses";
import { fetchClientsServer } from "@/lib/api/clients";
import TaskView from "@/components/department/clients/task-view";

export default async function Department() {
  const queryClient = new QueryClient();

  const courses = await fetchCourseServer();
  const initialSectionId = courses?.[0]?.course_sections?.[0]?.section_id
    ? String(courses[0].course_sections[0].section_id)
    : null;

  await queryClient.prefetchQuery({
    queryKey: ["courses"],
    queryFn: fetchCourseServer,
  });

  if (initialSectionId) {
    await queryClient.prefetchQuery({
      queryKey: ["clients", initialSectionId],
      queryFn: () => fetchClientsServer(initialSectionId),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {/* <DepartmentContainer /> */}
      {/* <TaskView /> */}
      <p>hello world</p>
    </HydrationBoundary>
  );
}
