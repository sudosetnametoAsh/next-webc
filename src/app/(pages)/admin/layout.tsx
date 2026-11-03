import AdminHeader from "@/components/admin/header";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminRealtimeListener from "@/components/admin/admin-realtime-listener";
import { AdminNavProvider } from "@/components/admin/admin-nav-context";
import { getSession } from "@/lib/auth/get-session";

export const metadata = {
  title: "WebC - Admin",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: { name?: string; email?: string; role?: string; avatarInitials?: string } | undefined;

  try {
    const session = await getSession();
    user = {
      name: session.user_name,
      email: session.user_email,
      role: "Admin",
      avatarInitials: session.user_name ? session.user_name.charAt(0).toUpperCase() : "A",
    };
  } catch {
    // Fallback if session is unavailable
    user = {
      name: "Administrator",
      email: "admin@sti.edu.ph",
      role: "Admin",
      avatarInitials: "A",
    };
  }

  return (
    <AdminNavProvider>
      <AdminRealtimeListener />
      <div data-portal="admin" className="flex h-dvh w-full overflow-hidden bg-portal-canvas text-portal-foreground">
        <AdminSidebar user={user} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <AdminHeader user={user} />
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto flex flex-col ">
            <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminNavProvider>
  );
}
