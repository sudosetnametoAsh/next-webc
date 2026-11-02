import React from "react";
import { getSession } from "@/lib/auth/get-session";
import { getCachedDepartmentReport } from "@/lib/services/department-cache";
import DepartmentReportsClient from "@/components/department/reports/department-reports-client";

export const unstable_dynamicStaleTime = 180;

export default async function ReportsPage() {
  const { user_id, department } = await getSession();
  const reportData = await getCachedDepartmentReport(user_id, department);

  return <DepartmentReportsClient reportData={reportData} />;
}
