// import Header  from '@/components/admin/header'
// import AdminDashboardd from '@/components/admin/admin-dashboardd'

import AdminDashboard from '@/components/admin/admin-dashboard'
import { getSession } from '@/lib/auth/get-session'

export default async function AdminPage() {
  const session = await getSession()

  return <AdminDashboard email={session?.user_email || ""} />
}
