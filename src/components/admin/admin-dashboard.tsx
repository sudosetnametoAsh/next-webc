import Header from '@/components/admin/header'
import AdminStats from '@/components/admin/admin-stats'
import QuickActions from '@/components/admin/quick-actions'
import CourseTemplatesSection from './course-template'

export default function AdminDashboard({ email }: { email: string }) {
  return (
    <div>
      <Header email={email} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <AdminStats />

        <QuickActions />

        <CourseTemplatesSection />
      </main>
    </div>
  )
}