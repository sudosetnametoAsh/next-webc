import Card from '@/components/admin/card'

const StatsCards = () => {
  return (
    // FIXED: Added 'mt-8' to push the entire row down away from the Header
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-8">
      
      {/* 1. Total Students */}
      <Card className="border-gray-200 bg-white flex flex-col items-center justify-center text-center py-6 h-full">
        <p className="text-sm font-medium text-gray-500">Total Students</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">
          1,247
        </p>
        <div className="mt-1 flex items-center justify-center gap-1.5">
          <span className="text-xs font-bold text-emerald-600 flex items-center">
            ↗ 12%
          </span>
          <span className="text-xs text-gray-400">vs last month</span>
        </div>
      </Card>

      {/* 2. Signed */}
      <Card className="border-emerald-200 bg-emerald-50 flex flex-col items-center justify-center text-center py-6 h-full">
        <p className="text-sm font-medium text-emerald-600">Signed</p>
        <p className="mt-2 text-3xl font-bold text-emerald-700">
          892
        </p>
      </Card>

      {/* 3. Incomplete */}
      <Card className="border-amber-200 bg-amber-50 flex flex-col items-center justify-center text-center py-6 h-full">
        <p className="text-sm font-medium text-amber-600">Incomplete</p>
        <p className="mt-2 text-3xl font-bold text-amber-700">
          234
        </p>
      </Card>

      {/* 4. Pending */}
      <Card className="border-gray-200 bg-white flex flex-col items-center justify-center text-center py-6 h-full">
        <p className="text-sm font-medium text-gray-500">Pending</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">
          121
        </p>
      </Card>
      
    </div>
  )
}

export default StatsCards