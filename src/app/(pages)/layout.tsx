// app/(protected)/layout.tsx

// 1. Make sure you are importing from 'next/navigation'
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token');

  if (!sessionToken) {
    redirect('/');
  }

  return (
    <section>
      {children}
    </section>
  );
}