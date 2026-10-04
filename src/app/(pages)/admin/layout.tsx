import { getSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";
import { PersistentAppShell } from "@/components/shell/persistent-app-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect("/");
  }

  if (session.role !== "Admin") {
    redirect("/auth-error?reason=admin_required");
  }

  return (
    <PersistentAppShell session={session}>
      {children}
    </PersistentAppShell>
  );
}