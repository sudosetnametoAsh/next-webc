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
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0 lg:overflow-hidden">
      {/* ── 1. Greeting Banner with Macro Metric Cards ── */}
      <div className="shrink-0 lg:max-h-[45%] lg:overflow-y-auto"><AdminGreeting userName={userName} /></div>

      {/* ── 2. Operational Command Grid ── */}
      <div className="grid shrink-0 grid-cols-1 items-stretch gap-4 lg:min-h-0 lg:flex-1 lg:shrink lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
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

