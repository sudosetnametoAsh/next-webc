import { Suspense } from "react";
import AdminReportsClient from "@/components/admin/reports/reports-page-client";

export const unstable_dynamicStaleTime = 180;

export default async function AdminReportsPage() {
  return (
    <Suspense fallback={null}>
      <AdminReportsClient />
    </Suspense>
  );
}
