import { getSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";
import { PersistentAppShell } from "@/components/shell/persistent-app-shell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!["Student", "Admin"].includes(session.role)) {
    redirect("/auth-error?reason=student_required");
  }

  return (
    <PersistentAppShell session={session}>
      {children}
    </PersistentAppShell>
  );
}
