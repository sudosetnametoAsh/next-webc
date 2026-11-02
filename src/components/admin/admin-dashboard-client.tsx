'use client'

import AdminGreeting from '@/components/admin/admin-greeting'
import DepartmentClientProgress from '@/components/admin/dashboard/department-client-progress'
import QuickOperations from '@/components/admin/dashboard/quick-operations'
import { useFetchPipelineRadar } from '@/hooks/admin/dashboard'

export default function AdminDashboardClient({ userName }: { userName: string }) {
  const {
    data: pipelineData,
    isLoading: isLoadingRadar,
  } = useFetchPipelineRadar('all')

  return (
    <div className="space-y-6">
      {/* ── 1. Greeting Banner with Macro Metric Cards ── */}
      <AdminGreeting userName={userName} />

      {/* ── 2. Operational Command Grid (2 Equal-Height Columns) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        {/* Column 1: Department Clearance Progress */}
        <DepartmentClientProgress
          departments={pipelineData?.departmentProgress}
          isLoading={isLoadingRadar}
        />

        {/* Column 2: Quick Operations (2x2 Grid) */}
        <QuickOperations />
      </div>
    </div>
  )
}

