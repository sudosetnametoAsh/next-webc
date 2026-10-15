'use client'

import type { Metadata } from "next";
import { ReportsView } from "@/components/admin/reports/reports-view";
import { useFetchReportSource } from "@/hooks/admin/reports";

export default function ReportsPage() {
  const { data: source, isLoading, error } = useFetchReportSource();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600 dark:text-slate-400">Loading report data...</div>
      </div>
    );
  }

  if (error || !source) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 dark:text-red-400">Failed to load report data</div>
      </div>
    );
  }

  return <ReportsView source={source} generatedBy={"Admin"} logoSrc="../../../../../public/stilogo.png" />;
}