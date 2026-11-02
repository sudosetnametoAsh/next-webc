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
  } catch {
    // Fallback to default mock user if session is unavailable
    user = {
      name: "Jaro, Jose Raphael (C.)",
      email: "02000248919@iacademy.edu.ph",
      role: "Student",
      avatarInitials: "JR",
      userId: "02000248919",
    };
  }

  return (
    <ClearanceNavProvider>
      <DashBoardRealtimeProvider studentId={user?.userId}>
        <div className="flex h-screen w-screen overflow-hidden bg-[#060a14]">
          <Sidebar user={user} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header user={user} />
            <main className="flex-1 overflow-y-auto flex flex-col relative">
              {children}
              <ClearanceCompletionFab studentId={user?.userId} user={user} />
            </main>
          </div>
        </div>
      </DashBoardRealtimeProvider>
    </ClearanceNavProvider>
  );
}
