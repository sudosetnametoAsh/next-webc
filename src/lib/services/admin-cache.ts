import { createClient } from "@/lib/db/supabase-server";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";

export interface AdminStatsBundle {
  totalStudents: number;
  totalStaff: number;
  totalClients: number;
  signed: number;
  incomplete: number;
  pending: number;
  totalNonCleared: number;
  averageCompletion: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// 3-minute TTL (180,000ms) for admin stats & pipeline radar aggregations
const ADMIN_STATS_TTL_MS = 180 * 1000;
const RADAR_TTL_MS = 180 * 1000;

let statsCache: CacheEntry<AdminStatsBundle> | null = null;
const radarCache = new Map<string, CacheEntry<any>>();

let pendingStatsFetch: Promise<AdminStatsBundle> | null = null;
const pendingRadarFetches = new Map<string, Promise<any>>();

/**
 * Calculates or retrieves cached high-level admin metrics across all students, staff, and clearances.
 * Coalesces concurrent in-flight requests into a single database execution.
 */
export async function getCachedAdminStats(): Promise<AdminStatsBundle> {
  const now = Date.now();

  // 1. Check existing fresh cache
  if (statsCache && now - statsCache.timestamp < ADMIN_STATS_TTL_MS) {
    return statsCache.data;
  }

  // 2. Coalesce in-flight simultaneous fetch
  if (pendingStatsFetch) {
    return pendingStatsFetch;
  }

  pendingStatsFetch = (async () => {
    try {
      const supabase = getSupabaseAdmin();

      const [totalStudentsResult, totalStaffResult] = await Promise.all([
        supabase.from("students").select("student_id", { count: "exact" }),
        supabase.from("staffs").select("staff_id", { count: "exact" }),
      ]);

      if (totalStudentsResult.error) {
        throw new Error(totalStudentsResult.error.message);
      }
      if (totalStaffResult.error) {
        throw new Error(totalStaffResult.error.message);
      }

      type ClearanceRecord = {
        user_id: string;
        status: string;
      };

      async function fetchAllClearanceRecords(): Promise<ClearanceRecord[]> {
        const PAGE_SIZE = 1000;
        let allData: ClearanceRecord[] = [];
        let from = 0;

        while (true) {
          const { data, error } = await supabase
            .from("clearance_records")
            .select("user_id, status, clearance_templates!inner(is_active)")
            .eq("clearance_templates.is_active", true)
            .range(from, from + PAGE_SIZE - 1);

          if (error) throw error;

          allData = [...allData, ...(data ?? [])];

          if ((data ?? []).length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }

        return allData;
      }

      const totalStudents = totalStudentsResult.count ?? 0;
      const totalStaff = totalStaffResult.count ?? 0;
      const totalClients = totalStudents + totalStaff;
      const clearances = await fetchAllClearanceRecords();

      const studentStatusMap = new Map<string, string[]>();

      for (const clearance of clearances) {
        const existing = studentStatusMap.get(clearance.user_id) ?? [];
        existing.push(clearance.status);
        studentStatusMap.set(clearance.user_id, existing);
      }

      let signed = 0;
      let incomplete = 0;
      let pending = 0;

      for (const [, statuses] of studentStatusMap) {
        const allSigned = statuses.every((status) => status === "Signed");
        const allPending = statuses.every((status) => status === "Pending");

        if (allSigned) {
          signed++;
        } else if (allPending) {
          pending++;
        } else {
          incomplete++;
        }
      }

      const totalNonCleared = incomplete + pending;
      const averageCompletion =
        totalClients > 0 ? Math.round((signed / totalClients) * 100) : 0;

      const bundle: AdminStatsBundle = {
        totalStudents,
        totalStaff,
        totalClients,
        signed,
        incomplete,
        pending,
        totalNonCleared,
        averageCompletion,
      };

      statsCache = {
        data: bundle,
        timestamp: Date.now(),
      };

      return bundle;
    } finally {
      pendingStatsFetch = null;
    }
  })();

  return pendingStatsFetch;
}

/**
 * Retrieves cached pipeline radar data or executes the fetcher with in-flight deduplication.
 */
export async function getCachedAdminRadar<T>(
  filterKey: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const normalizedKey = filterKey || "all";

  const cached = radarCache.get(normalizedKey);
  if (cached && now - cached.timestamp < RADAR_TTL_MS) {
    return cached.data;
  }

  const existingPending = pendingRadarFetches.get(normalizedKey);
  if (existingPending) {
    return existingPending;
  }

  const fetchPromise = (async () => {
    try {
      const data = await fetcher();
      radarCache.set(normalizedKey, {
        data,
        timestamp: Date.now(),
      });
      return data;
    } finally {
      pendingRadarFetches.delete(normalizedKey);
    }
  })();

  pendingRadarFetches.set(normalizedKey, fetchPromise);
  return fetchPromise;
}

/**
 * Instant invalidation for server admin cache (stats and pipeline radar).
 */
export function invalidateServerAdminCache() {
  statsCache = null;
  radarCache.clear();
  pendingStatsFetch = null;
  pendingRadarFetches.clear();
}
