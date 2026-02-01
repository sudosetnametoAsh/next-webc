import Card from '@/components/admin/card'

const StatsCards = () => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      
      {/* Total Students */}
      <Card className="border-gray-200">
        <p className="text-sm text-gray-500">Total Students</p>
        <p className="mt-1 text-3xl font-semibold text-gray-900">
          {/* {stats.totalStudents.toLocaleString()} */}
          1200
        </p>
        <div className="mt-1 flex items-center gap-1">
          <span className="text-xs text-emerald-600">↑
            {/* {stats.totalStudentsChange}% */}
            12%
            </span>
          <span className="text-xs text-gray-400">vs last month</span>
        </div>
      </Card>

      {/* Signed */}
      <Card className="border-emerald-200 bg-emerald-50">
        <p className="text-sm text-emerald-700">Signed</p>
        <p className="mt-1 text-3xl font-semibold text-emerald-700">
          {/* {stats.signed.toLocaleString()} */}
          800
        </p>
      </Card>

      {/* Incomplete */}
      <Card className="border-amber-200 bg-amber-50">
        <p className="text-sm text-amber-700">Incomplete</p>
        <p className="mt-1 text-3xl font-semibold text-amber-700">
          {/* {stats.incomplete.toLocaleString()} */}
          200
        </p>
      </Card>

      {/* Pending */}
      <Card className="border-gray-200">
        <p className="text-sm text-gray-500">Pending</p>
        <p className="mt-1 text-3xl font-semibold text-gray-900">
          {/* {stats.pending.toLocaleString()} */}
          100
        </p>
      </Card>
    </div>
  )
}

export default StatsCards