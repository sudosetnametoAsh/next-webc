import { makeGetSummary } from "@/composition/clearance/make-get-summary";
import { makeGetClearanceRecords } from "@/composition/clearance/make-get-clearance-records";
import { makeGetOfficeHours } from "@/composition/clearance/make-get-office-hours";
import { makeGetStudentProfile } from "@/composition/clearance/make-get-student-profile";
import { makeGetDepartmentDetailsServer } from "@/composition/clearance/make-get-department-details-server";
import type {
  getClearanceRecordsPromise,
  getDepartmentDetailsPromise,
  getOfficeHoursPromise,
  getStudentProfilePromise,
  getSummaryPromise,
} from "@/modules/clearance/application/repository/dashboard-repository";

export interface ClearanceBundle {
  summary: getSummaryPromise;
  records: getClearanceRecordsPromise;
  officeHours: getOfficeHoursPromise;
  studentProfile: getStudentProfilePromise | null;
  tasks: getDepartmentDetailsPromise;
}

interface CacheEntry {
  data: ClearanceBundle;
  timestamp: number;
}

// 3-minute TTL (180 seconds)
const CACHE_TTL_MS = 180 * 1000;

// Global in-memory cache map keyed by student userId
const serverClearanceCache = new Map<string, CacheEntry>();

// Concurrent fetch deduplication map
const pendingFetches = new Map<string, {
  token: symbol;
  promise: Promise<ClearanceBundle>;
}>();

/**
 * Retrieves the full clearance dataset for a given student from memory if fresh (< 3 mins),
 * or executes the database queries in parallel and populates the cache.
 */
export async function getCachedClearanceBundle(
  userId: string
): Promise<ClearanceBundle> {
  if (!userId) {
    throw new Error("User ID is required to fetch clearance bundle");
  }

  const now = Date.now();
  const cached = serverClearanceCache.get(userId);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Deduplicate concurrent fetches for the same student
  if (pendingFetches.has(userId)) {
    return pendingFetches.get(userId)!.promise;
  }

  const token = Symbol();
  const fetchPromise = (async () => {
    try {
      const [
        getSummary,
        getClearanceRecords,
        getOfficeHours,
        getStudentProfile,
        getDepartmentDetailsServer,
      ] = await Promise.all([
        makeGetSummary(),
        makeGetClearanceRecords(),
        makeGetOfficeHours(),
        makeGetStudentProfile(),
        makeGetDepartmentDetailsServer(),
      ]);

      const [summary, records, officeHours, studentProfile, tasks] =
        await Promise.all([
          getSummary.execute(userId),
          getClearanceRecords.execute(userId),
          getOfficeHours.execute(userId),
          getStudentProfile.execute(userId),
          getDepartmentDetailsServer.execute(userId),
        ]);

      const bundle: ClearanceBundle = {
        summary,
        records,
        officeHours,
        studentProfile,
        tasks,
      };

      // An invalidated request may still finish after a newer request. Only
      // the current request may publish its result back into the shared cache.
      if (pendingFetches.get(userId)?.token === token) {
        serverClearanceCache.set(userId, {
          data: bundle,
          timestamp: Date.now(),
        });
      }

      return bundle;
    } finally {
      if (pendingFetches.get(userId)?.token === token) {
        pendingFetches.delete(userId);
      }
    }
  })();

  pendingFetches.set(userId, { token, promise: fetchPromise });
  return fetchPromise;
}

/**
 * Invalidates the server clearance cache for a specific student or all students.
 */
export function invalidateServerClearanceCache(userId?: string) {
  if (userId) {
    serverClearanceCache.delete(userId);
    pendingFetches.delete(userId);
  } else {
    serverClearanceCache.clear();
    pendingFetches.clear();
  }
}
