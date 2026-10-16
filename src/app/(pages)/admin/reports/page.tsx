'use client'

import { DashboardSkeleton } from "@/components/shell/loading-states";
import { ReportsView } from "@/components/admin/reports/reports-view";
import { useFetchReportSource } from "@/hooks/admin/reports";

export default function ReportsPage() {
  const { data: source, isLoading, error } = useFetchReportSource();

  if (isLoading) {
    return <DashboardSkeleton label="Loading report data" />;
  }

  if (error || !source) {
    return (
      <div role="alert" className="flex items-center justify-center min-h-64">
        <div className="text-red-600 dark:text-red-400">Failed to load report data</div>
      </div>
    );
  }

  return <ReportsView source={source} generatedBy={"Admin"} logoSrc="../../../../../public/stilogo.png" />;
}
