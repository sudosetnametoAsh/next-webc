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
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      {/* ── 1. Greeting Banner with Macro Metric Cards ── */}
      <div className="max-h-[45%] shrink-0 overflow-y-auto"><AdminGreeting userName={userName} /></div>

      {/* ── 2. Operational Command Grid ── */}
      <div className="grid min-h-0 shrink grid-cols-1 grid-rows-[repeat(2,minmax(0,auto))] items-stretch gap-4 overflow-hidden lg:grid-cols-2 lg:grid-rows-[minmax(0,auto)]">
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

