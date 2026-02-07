import Header from '@/components/admin/header'
import AdminStats from '@/components/admin/admin-stats'
import QuickActions from '@/components/admin/quick-actions'
import CourseTemplatesList from '@/components/admin/course-templates-list'

export default function AdminDashboard({ email }: { email: string }) {
  return (
    <div>
      <Header email={email} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <AdminStats />

        <QuickActions />

        {/* Course Templates Section */}
        <section>
          <div className='mb-4'>
            <h2 className='text-lg font-semibold text-gray-900'>Course Templates</h2>
            <p className='text-sm text-gray-500'>Manage clearance templates for each course</p>
          </div>
          <CourseTemplatesList />
        </section>
      </main>
    </div>
  )
}