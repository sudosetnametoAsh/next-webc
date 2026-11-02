import { makeGetStatCardValue } from "@/composition/staff/make-get-stat-card-value";
import { makeGetRecentSubmissions } from "@/composition/staff/make-get-recent-submissions";
import { makeGetReadyToSignClients } from "@/composition/staff/make-get-ready-to-sign-clients";
import { makeGetCourseVelocity } from "@/composition/staff/make-get-course-velocity";
import { makeGetDepartmentReport } from "@/composition/staff/make-get-department-report";
import { makeGetSchedule } from "@/composition/staff/make-get-schedule";
import { createClient } from "@/lib/db/supabase-server";
import { NotFoundError } from "@/modules/staff/application/error";
import type {
  getStatCardValuePromise,
  getRecentSubmissionsPromise,
  ReadyToSignClient,
  CourseVelocity,
  DepartmentReportData,
} from "@/modules/staff/application/repository/dashboard-repository";

export interface DepartmentDashboardBundle {
  stats: getStatCardValuePromise;
  recentSubmissions: getRecentSubmissionsPromise[];
  readyToSignClients: ReadyToSignClient[];
  courseVelocity: CourseVelocity[];
}

export interface DepartmentScheduleBundle {
  deptName: string;
  iconName: string;
  floor: string;
  room: string;
  timeIn: string;
  timeOut: string;
  weeklySchedule: any;
  earlyOutDate: string | null;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// 3-minute TTL (180,000ms) for dashboard & reports
const DASHBOARD_TTL_MS = 180 * 1000;
// 5-minute TTL (300,000ms) for schedule & room configuration
const SCHEDULE_TTL_MS = 300 * 1000;

const dashboardCache = new Map<string, CacheEntry<DepartmentDashboardBundle>>();
const reportCache = new Map<string, CacheEntry<DepartmentReportData>>();
const scheduleCache = new Map<string, CacheEntry<DepartmentScheduleBundle>>();

const pendingDashboardFetches = new Map<string, Promise<DepartmentDashboardBundle>>();
const pendingReportFetches = new Map<string, Promise<DepartmentReportData>>();
const pendingScheduleFetches = new Map<string, Promise<DepartmentScheduleBundle>>();

/**
 * Retrieves the cached department dashboard bundle for the authenticated staff user.
 */
export async function getCachedDepartmentDashboard(
  staffUserId: string
): Promise<DepartmentDashboardBundle> {
  if (!staffUserId) {
    throw new Error("Staff user ID is required to fetch dashboard data");
  }

  const now = Date.now();
  const cached = dashboardCache.get(staffUserId);

  if (cached && now - cached.timestamp < DASHBOARD_TTL_MS) {
    return cached.data;
  }

  if (pendingDashboardFetches.has(staffUserId)) {
    return pendingDashboardFetches.get(staffUserId)!;
  }

  const fetchPromise = (async () => {
    try {
      const getStatCardValue = makeGetStatCardValue();
      const getRecentSubmissions = makeGetRecentSubmissions();
      const getReadyToSignClients = makeGetReadyToSignClients();
      const getCourseVelocity = makeGetCourseVelocity();

      const [stats, recentSubmissions, readyToSignClients, courseVelocity] =
        await Promise.all([
          getStatCardValue.execute(staffUserId),
          getRecentSubmissions.execute(staffUserId),
          getReadyToSignClients.execute(staffUserId),
          getCourseVelocity.execute(staffUserId),
        ]);

      const bundle: DepartmentDashboardBundle = {
        stats,
        recentSubmissions,
        readyToSignClients,
        courseVelocity,
      };

      dashboardCache.set(staffUserId, {
        data: bundle,
        timestamp: Date.now(),
      });

      return bundle;
    } finally {
      pendingDashboardFetches.delete(staffUserId);
    }
  })();

  pendingDashboardFetches.set(staffUserId, fetchPromise);
  return fetchPromise;
}

/**
 * Retrieves the cached department report data.
 */
export async function getCachedDepartmentReport(
  staffUserId: string,
  departmentName?: string
): Promise<DepartmentReportData> {
  if (!staffUserId) {
    throw new Error("Staff user ID is required to fetch report data");
  }

  const cacheKey = `${staffUserId}_${departmentName || "default"}`;
  const now = Date.now();
  const cached = reportCache.get(cacheKey);

  if (cached && now - cached.timestamp < DASHBOARD_TTL_MS) {
    return cached.data;
  }

  if (pendingReportFetches.has(cacheKey)) {
    return pendingReportFetches.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      const getDepartmentReport = makeGetDepartmentReport();
      const reportData = await getDepartmentReport.execute(staffUserId, departmentName);

      reportCache.set(cacheKey, {
        data: reportData,
        timestamp: Date.now(),
      });

      return reportData;
    } finally {
      pendingReportFetches.delete(cacheKey);
    }
  })();

  pendingReportFetches.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Retrieves the cached department schedule and location details.
 */
export async function getCachedDepartmentSchedule(
  staffUserId: string,
  fallbackDeptName?: string
): Promise<DepartmentScheduleBundle> {
  if (!staffUserId) {
    throw new Error("Staff user ID is required to fetch schedule");
  }

  const now = Date.now();
  const cached = scheduleCache.get(staffUserId);

  if (cached && now - cached.timestamp < SCHEDULE_TTL_MS) {
    return cached.data;
  }

  if (pendingScheduleFetches.has(staffUserId)) {
    return pendingScheduleFetches.get(staffUserId)!;
  }

  const fetchPromise = (async () => {
    try {
      const supabase = await createClient();
      const getSchedule = makeGetSchedule();

      let initialSchedule = {
        time_in: "08:00:00",
        time_out: "17:00:00",
        weekly_schedule: null as any,
        early_out_date: null as string | null,
      };

      try {
        const res = await getSchedule.execute(staffUserId);
        if (res.time_in && res.time_out) {
          initialSchedule = {
            time_in: res.time_in,
            time_out: res.time_out,
            weekly_schedule: res.weekly_schedule || null,
            early_out_date: res.early_out_date || null,
          };
        }
      } catch (err) {
        if (!(err instanceof NotFoundError)) {
          console.error("Error fetching staff schedule:", err);
        }
      }

      let deptName = fallbackDeptName || "Department";
      let iconName = "Building2";
      let floor = "Ground Floor";
      let room = "Office 101";

      const { data: templateData } = await supabase
        .from("clearance_templates")
        .select(`
          dept_id,
          clearance_departments (
            dept_id,
            dept_name,
            icon_name,
            floor,
            room
          )
        `)
        .eq("staff_id", staffUserId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      const matchedDept = Array.isArray(templateData?.clearance_departments)
        ? templateData.clearance_departments[0]
        : templateData?.clearance_departments;

      if (matchedDept) {
        deptName = matchedDept.dept_name;
        iconName = matchedDept.icon_name || "Building2";
        floor = matchedDept.floor || floor;
        room = matchedDept.room || room;
      } else if (fallbackDeptName) {
        const { data: fallbackDept } = await supabase
          .from("clearance_departments")
          .select("dept_id, dept_name, icon_name, floor, room")
          .ilike("dept_name", fallbackDeptName.trim())
          .limit(1)
          .maybeSingle();
        if (fallbackDept) {
          deptName = fallbackDept.dept_name;
          iconName = fallbackDept.icon_name || "Building2";
          floor = fallbackDept.floor || floor;
          room = fallbackDept.room || room;
        }
      }

      const bundle: DepartmentScheduleBundle = {
        deptName,
        iconName,
        floor,
        room,
        timeIn: initialSchedule.time_in,
        timeOut: initialSchedule.time_out,
        weeklySchedule: initialSchedule.weekly_schedule,
        earlyOutDate: initialSchedule.early_out_date,
      };

      scheduleCache.set(staffUserId, {
        data: bundle,
        timestamp: Date.now(),
      });

      return bundle;
    } finally {
      pendingScheduleFetches.delete(staffUserId);
    }
  })();

  pendingScheduleFetches.set(staffUserId, fetchPromise);
  return fetchPromise;
}

/**
 * Invalidates the server-side department cache for a specific staff user or all staff.
 */
export function invalidateServerDepartmentCache(staffUserId?: string) {
  if (staffUserId) {
    dashboardCache.delete(staffUserId);
    scheduleCache.delete(staffUserId);
    pendingDashboardFetches.delete(staffUserId);
    pendingScheduleFetches.delete(staffUserId);

    // Evict report keys starting with staffUserId
    for (const key of reportCache.keys()) {
      if (key.startsWith(staffUserId)) {
        reportCache.delete(key);
        pendingReportFetches.delete(key);
      }
    }
  } else {
    dashboardCache.clear();
    reportCache.clear();
    scheduleCache.clear();
    pendingDashboardFetches.clear();
    pendingReportFetches.clear();
    pendingScheduleFetches.clear();
  }
}
