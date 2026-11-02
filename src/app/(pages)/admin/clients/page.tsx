import { Suspense } from "react";
import AdminClientsClient from "@/components/admin/clients-page-client";

export const unstable_dynamicStaleTime = 180;

export default async function AdminClientsPage() {
  return (
    <Suspense fallback={null}>
      <AdminClientsClient />
    </Suspense>
  );
}
