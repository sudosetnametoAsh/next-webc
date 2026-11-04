import { redirect } from "next/navigation";
import { ClientNotEnrolledError, ENROLLMENT_NOTICE_URL } from "@/lib/auth/client-enrollment";
import ClientEnrollmentGuard from "@/components/auth/client-enrollment-guard";
import Header from "@/components/clearance/header";
import Sidebar from "@/components/clearance/sidebar";
import { ClearanceNavProvider } from "@/components/clearance/clearance-nav-context";
import DashBoardRealtimeProvider from "@/components/clearance/dashboard-realtime-provider";
import ClearanceCompletionFab from "@/components/clearance/clearance-completion-fab";
import { getSession } from "@/lib/auth/get-session";

export const metadata = {
  title: "WebC - Client",
};

export default async function ClearanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user:
    | {
        name?: string;
        email?: string;
        role?: string;
        avatarInitials?: string;
        department?: string;
        userId?: string;
      }
    | undefined;

  try {
    const session = await getSession();
    user = {
      name: session.user_name,
      email: session.user_email,
      role: session.department ? `${session.department} Staff` : "Student",
      avatarInitials: session.user_name ? session.user_name.charAt(0).toUpperCase() : undefined,
      department: session.department || undefined,
      userId: session.user_id,
    };
  } catch (error) {
    if (error instanceof ClientNotEnrolledError) redirect(ENROLLMENT_NOTICE_URL);
    throw error;
  }

  return (
    <ClientEnrollmentGuard userId={user?.userId}>
    <ClearanceNavProvider>
      <DashBoardRealtimeProvider studentId={user?.userId}>
        <div data-portal="clearance" className="flex h-dvh w-full overflow-hidden bg-portal-canvas text-portal-foreground">
          <Sidebar user={user} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <Header user={user} />
            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto flex flex-col relative">
              {children}
              <ClearanceCompletionFab studentId={user?.userId} user={user} />
            </main>
          </div>
        </div>
      </DashBoardRealtimeProvider>
    </ClearanceNavProvider>
    </ClientEnrollmentGuard>
  );
}
