import AdminDashboard from '@/components/admin/admin-dashboard'
import { getSession } from '@/lib/auth/get-session'

export default async function AdminPage() {
  const session = await getSession()

  return <AdminDashboard email={session?.email || ""} />
}