import BreadCrumb from "@/components/department/bread-crumb";
import Sidebar from "@/components/department/sidebar";
import { DepartmentProvider } from "@/context/deparment";
import { fetchCourseServer } from "@/lib/api/courses";
import { fetchStudentsServer } from "@/lib/api/students";
import { getSession } from "@/lib/auth/get-session";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

export default async function DepartmentRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
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
      queryKey: ["students", initialSectionId],
      queryFn: () => fetchStudentsServer(initialSectionId),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DepartmentProvider departmentName={session.department}>
        <div className="flex h-screen w-screen overflow-hidden">
          <Sidebar department={session.department} user_name={session.user_name} />
          <section className="flex w-full flex-1 flex-col">
            <BreadCrumb />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </section>
        </div>
      </DepartmentProvider>
    </HydrationBoundary>
  );
}
