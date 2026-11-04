import { DepartmentClientItem } from "@/app/api/department/clients/route";
import { useQuery, QueryClient } from "@tanstack/react-query";

export function useFetchDepartmentClients() {
  return useQuery<DepartmentClientItem[]>({
    queryKey: ["department-clients"],
    queryFn: ({ signal }) => fetchDepartmentClients(signal),
    staleTime: 1000 * 60 * 2, // 2 minutes fresh window
    refetchInterval: 30000, // 30-second background poll fallback
    refetchIntervalInBackground: false, // pause polling when browser window is inactive/minimized
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
}

export async function fetchDepartmentClients(signal?: AbortSignal): Promise<DepartmentClientItem[]> {
  const response = await fetch("/api/department/clients", {
    credentials: "include",
    signal,
    cache: "no-store",
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || "Failed to fetch department clients");
  }
  return json.data || [];
}

/**
 * Prefetches department clients list into the TanStack Query cache.
 */
export async function prefetchDepartmentClients(queryClient: QueryClient) {
  return queryClient.prefetchQuery({
    queryKey: ["department-clients"],
    queryFn: ({ signal }) => fetchDepartmentClients(signal),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Invalidates department clients cache.
 */
export function invalidateDepartmentClients(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: ["department-clients"],
  });
}
