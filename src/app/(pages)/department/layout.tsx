import DepartmentHeader from "@/components/department/header";
import Sidebar from "@/components/department/sidebar";
import { DepartmentNavProvider } from "@/components/department/department-nav-context";
import { DepartmentProvider } from "@/context/deparment";
import { fetchCourseServer } from "@/lib/api/courses";
import { getSession } from "@/lib/auth/get-session";
import RealtimeDashboardListener from "@/components/department/dashboard-listener";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

export const metadata = {
  title: "WebC - Department",
};

export default async function DepartmentRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["courses"],
    queryFn: fetchCourseServer,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DepartmentProvider departmentName={session.department} userId={session.user_id}>
        <DepartmentNavProvider>
          <RealtimeDashboardListener />
          <div data-portal="department" className="flex h-dvh w-full overflow-hidden bg-portal-canvas text-portal-foreground">
            <Sidebar
              department={session.department}
              user_name={session.user_name}
              user_id={session.user_id}
            />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <DepartmentHeader
                department={session.department}
                user_name={session.user_name}
                user_id={session.user_id}
              />
              <main className="min-h-0 min-w-0 flex-1 overflow-y-auto flex flex-col">
                <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </DepartmentNavProvider>
      </DepartmentProvider>
    </HydrationBoundary>
  );
}
