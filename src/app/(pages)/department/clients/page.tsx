import { Suspense } from "react";
import ClientsClient from "@/components/department/clients/clients-client";

export const unstable_dynamicStaleTime = 180;

export default async function Clients() {
  return (
    <Suspense fallback={null}>
      <ClientsClient />
    </Suspense>
  );
}
