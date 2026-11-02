import { Suspense } from "react";
import AdminDepartmentsClient from "@/components/admin/departments-page-client";

export const unstable_dynamicStaleTime = 180;

export default async function AdminDepartmentsPage() {
  return (
    <Suspense fallback={null}>
      <AdminDepartmentsClient />
    </Suspense>
  );
}
