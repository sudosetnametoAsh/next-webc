"use client";

import { useQuery } from "@tanstack/react-query";
import { useDepartmentContext } from "@/context/deparment";
import type { DepartmentDashboardBundle } from "@/lib/services/department-cache";

export function useDepartmentDashboard(initialData?: DepartmentDashboardBundle) {
  const { userId } = useDepartmentContext();
  return useQuery<DepartmentDashboardBundle>({
    queryKey: ["department-dashboard", userId],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/department/dashboard", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Could not refresh department dashboard.");
      return response.json();
    },
    enabled: Boolean(userId),
    initialData,
    // Server props can come from the page's three-minute cache.
    initialDataUpdatedAt: 0,
    staleTime: 30000,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
}
