"use client";

import { useQuery } from "@tanstack/react-query";
import { useDepartmentContext } from "@/context/deparment";
import type { DepartmentProgress } from "@/types/department-progress";

export function useClientClearanceProgress(studentId: string, initialData?: DepartmentProgress[], initialDataUpdatedAt?: number) {
  const { userId } = useDepartmentContext();
  return useQuery<DepartmentProgress[]>({
    queryKey: ["department-client-progress", userId, studentId],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/department/clients/progress?${new URLSearchParams({ studentId })}`, {
        signal, cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load department status.");
      return result.data;
    },
    enabled: Boolean(userId && studentId),
    initialData,
    initialDataUpdatedAt,
    staleTime: 30000,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
}
