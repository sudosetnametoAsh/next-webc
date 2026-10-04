import { CourseSectionNav } from "@/components/department/course-section-nav";
import { DepartmentProvider } from "@/context/deparment";
import { fetchCourseServer } from "@/lib/api/courses";
import { fetchClientsServer } from "@/lib/api/clients";
import { getSession } from "@/lib/auth/get-session";
import { PersistentAppShell } from "@/components/shell/persistent-app-shell";
import { redirect } from "next/navigation";
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
  if (!["Staff", "Department", "Admin"].includes(session.role)) {
    redirect("/auth-error?reason=faculty_required");
  }

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
      <DepartmentProvider departmentName={session.department} userId={session.user_id}>
        <PersistentAppShell
          session={session}
          sidebarExtra={<CourseSectionNav />}
        >
          {children}
        </PersistentAppShell>
      </DepartmentProvider>
    </HydrationBoundary>
  );
}
