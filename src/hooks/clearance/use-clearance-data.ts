"use client";

import { useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient, QueryClient } from "@tanstack/react-query";
import type {
  getClearanceRecordsPromise,
  getDepartmentDetailsPromise,
  getOfficeHoursPromise,
  getStudentProfilePromise,
  getSummaryPromise,
} from "@/modules/clearance/application/repository/dashboard-repository";

export interface ClearanceDataResponse {
  summary: getSummaryPromise;
  records: getClearanceRecordsPromise;
  officeHours: getOfficeHoursPromise;
  studentProfile: getStudentProfilePromise | null;
  tasks: getDepartmentDetailsPromise;
}

export const clearanceQueryKeys = {
  all: ["clearance"] as const,
  student: (studentId?: string) =>
    ["clearance", studentId || "current"] as const,
};

export async function fetchClearanceData(
  studentId?: string,
  fresh = false,
  signal?: AbortSignal
): Promise<ClearanceDataResponse> {
  const params = new URLSearchParams();
  if (studentId) params.set("studentId", studentId);
  if (fresh) params.set("fresh", "true");
  const queryStr = params.toString();
  const url = queryStr ? `/api/student/clearance-data?${queryStr}` : "/api/student/clearance-data";

  const res = await fetch(url, {
    method: "GET",
    signal,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(errorBody || "Failed to fetch clearance data");
  }

  return res.json();
}

/**
 * Prefetches clearance data for zero-latency instant rendering upon user navigation.
 */
export async function prefetchClearanceData(
  queryClient: QueryClient,
  studentId?: string
) {
  const queryKey = clearanceQueryKeys.student(studentId);
  return queryClient.prefetchQuery({
    queryKey,
    queryFn: ({ signal }) => fetchClearanceData(studentId, true, signal),
    staleTime: 1000 * 60 * 3, // 3 minutes fresh
  });
}

/**
 * Invalidates student clearance cache across all views and triggers fresh background sync.
 */
export function invalidateClearanceData(
  queryClient: QueryClient,
  studentId?: string
) {
  return queryClient.invalidateQueries({
    queryKey: studentId
      ? clearanceQueryKeys.student(studentId)
      : clearanceQueryKeys.all,
  });
}

interface UseClearanceDataOptions {
  initialData?: {
    summary?: getSummaryPromise;
    records?: getClearanceRecordsPromise;
    officeHours?: getOfficeHoursPromise;
    studentProfile?: getStudentProfilePromise | null;
    tasks?: getDepartmentDetailsPromise;
  };
  enabled?: boolean;
}

/**
 * Core TanStack React Query hook providing cached, synchronized clearance data
 * across the client clearance portal (/clearance, /clearance/tasks, /clearance/schedules).
 */
export function useClearanceData(
  studentId?: string,
  options?: UseClearanceDataOptions
) {
  const queryClient = useQueryClient();
  const queryKey = clearanceQueryKeys.student(studentId);
  const initialMountTimeRef = useRef<number>(Date.now());

  // If queryClient already has cached data, preserve it; only fall back to initialData
  const existingCached = queryClient.getQueryData<ClearanceDataResponse>(queryKey);

  const initialData = useMemo(() => {
    if (existingCached) return existingCached;
    if (!options?.initialData) return undefined;

    return {
      summary: options.initialData.summary ?? {
        signed: 0,
        incomplete: 0,
        pending: 0,
        department_count: 0,
        cleared_department: 0,
        remaining_department: 0,
      },
      records: options.initialData.records ?? [],
      officeHours: options.initialData.officeHours ?? [],
      studentProfile: options.initialData.studentProfile ?? null,
      tasks: options.initialData.tasks ?? [],
    };
  }, [options?.initialData, existingCached]);

  // Listen for custom global event to invalidate clearance cache (e.g., from modal submissions)
  useEffect(() => {
    const handleInvalidate = () => {
      invalidateClearanceData(queryClient, studentId);
    };

    window.addEventListener("clearance_data_invalidated", handleInvalidate);
    return () => {
      window.removeEventListener("clearance_data_invalidated", handleInvalidate);
    };
  }, [queryClient, studentId]);

  const query = useQuery({
    queryKey,
    // Realtime invalidation must also bypass the server's three-minute cache.
    // Staff approvals/rejections can write directly to Supabase, so they do not
    // pass through an API route that invalidates that cache.
    queryFn: ({ signal }) => fetchClearanceData(studentId, true, signal),
    staleTime: 1000 * 60 * 3, // 3 minutes stale time
    gcTime: 1000 * 60 * 10,   // 10 minutes cache garbage collection
    initialData,
    initialDataUpdatedAt: initialData ? initialMountTimeRef.current : undefined,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
    enabled: options?.enabled !== false && Boolean(studentId),
  });

  const effectiveData = query.data || existingCached;

  return {
    ...query,
    clearanceData: effectiveData,
    summary: effectiveData?.summary ?? options?.initialData?.summary,
    records: effectiveData?.records ?? options?.initialData?.records ?? [],
    officeHours:
      effectiveData?.officeHours ?? options?.initialData?.officeHours ?? [],
    studentProfile:
      effectiveData?.studentProfile !== undefined
        ? effectiveData.studentProfile
        : (options?.initialData?.studentProfile ?? null),
    tasks: effectiveData?.tasks ?? options?.initialData?.tasks ?? [],
  };
}
