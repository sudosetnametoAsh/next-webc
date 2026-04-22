import { getSession } from "@/lib/auth/get-session";
import AdminSidebar from "@/components/admin/admin-sidebar";
import SignOutButton from "@/components/auth/sign-out-button"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  return (
    <div className="flex min-h-screen bg-slate">
      <AdminSidebar
        user={{
          name: session.name,
          email: session.email,
          role: "",
          avatarInitials: session.email.charAt(0).toUpperCase(),
        }}
        signOutSlot={<SignOutButton />}
      />

      {/* Main content area — offset on mobile for hamburger button */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}