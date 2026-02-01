import Header  from '@/components/admin/header'
import AdminDashboard from '@/components/admin/admin-dashboard'

const page = () => {
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <AdminDashboard />
        </main>
      </div>
    </>

  )
}

export default page