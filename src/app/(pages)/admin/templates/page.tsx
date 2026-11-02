import { Suspense } from "react";
import AdminTemplatesClient from "@/components/admin/templates-page-client";

export const unstable_dynamicStaleTime = 180;

export default async function AdminTemplatesPage() {
  return (
    <Suspense fallback={null}>
      <AdminTemplatesClient />
    </Suspense>
  );
}
