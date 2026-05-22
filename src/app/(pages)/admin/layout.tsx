import AdminSidebar from '@/components/admin/admin-sidebar';
import { getSession } from "@/lib/auth/get-session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  
  const session = await getSession()

  return (
    <div className="flex min-h-screen bg-slate">
      <AdminSidebar
        user={{
          name: session.user_name,
          email: session.user_email,
          role: "Admin",
          avatarInitials: session.user_name.charAt(0).toUpperCase(),
        }}
      />

      {/* Main content area — offset on mobile for hamburger button */}
      {/* remove - max-w-7xl */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="max-w-[1920px] mx-auto px-6 sm:px-6 lg:px-12 py-8 space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}