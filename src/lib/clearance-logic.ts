import { CLEARANCE_HIERARCHY, SigningEligibility, ClearanceRecordWithTier } from "@/types/clearance";
import { Students } from "@/types/students";

/**
 * Checks if a student is eligible for signing by the current department
 * based on dynamic tier priority (tier 1 is highest priority).
 *
 * Rules:
 * 1. Staff clearances have no hierarchy (always eligible).
 * 2. If the current department has already signed, status is 'already_signed'.
 * 3. Current department can sign if ALL departments with a strictly lower tier number
 *    (tier < currentDeptTier) have already signed off (status === "Signed").
 * 4. Departments within the same tier can sign in parallel in any order.
 */
export function checkSigningEligibilityByTier(
  records: ClearanceRecordWithTier[],
  currentDeptTier: number,
  isStaffView: boolean = false
): SigningEligibility {
  if (isStaffView) {
    const currentRecord = records.find((r) => r.tier === currentDeptTier);
    const isSigned = currentRecord?.status === "Signed";
    return {
      status: isSigned ? "already_signed" : "eligible",
      message: isSigned ? "Already signed" : "Ready to sign",
    };
  }

  const currentRecord = records.find((r) => r.tier === currentDeptTier);
  if (currentRecord?.status === "Signed") {
    return {
      status: "already_signed",
      message: "Already signed",
    };
  }

  // Preceding tiers must all be Signed (excluding deactivated templates)
  const blockingRecords = records.filter(
    (r) => (r as any).is_active !== false && r.tier < currentDeptTier && r.status !== "Signed"
  );

  if (blockingRecords.length > 0) {
    const lowestUnsignedTier = Math.min(...blockingRecords.map((r) => r.tier));
    const firstBlocking = blockingRecords.find((r) => r.tier === lowestUnsignedTier);
    return {
      status: "ineligible",
      blockingDepartment: firstBlocking?.dept_name,
      message: firstBlocking?.dept_name
        ? `Pending ${firstBlocking.dept_name} (Phase ${lowestUnsignedTier}) settlement`
        : `Waiting for Phase ${lowestUnsignedTier} completion`,
    };
  }

  return {
    status: "eligible",
    message: "Ready to sign",
  };
}

/**
 * Checks if a student is eligible for signing by the current department
 * based on the institutional hierarchy.
 */
export function checkSigningEligibility(
  student: Students,
  currentDeptName: string,
  isStaffView: boolean = false
): SigningEligibility {
  // Staff clearances have no hierarchy
  if (isStaffView) {
    const isSigned = student.clearance_records?.[0]?.status === "Signed";
    return {
      status: isSigned ? "already_signed" : "eligible",
      message: isSigned ? "Already signed" : "Ready to sign",
    };
  }

  const records = student.clearance_records || [];
  const currentRecord = records[0]; // Assuming records[0] is the current dept's record

  if (currentRecord?.status === "Signed") {
    return {
      status: "already_signed",
      message: "Already signed",
    };
  }

  // 1. Cashier is always eligible
  if (currentDeptName === CLEARANCE_HIERARCHY.CASHIER) {
    return {
      status: "eligible",
      message: "Ready to sign (Priority: Cashier)",
    };
  }

  // 2. Others need Cashier to be settled
  const cashierRecord = records.find(r => 
    (r as any).dept_name === CLEARANCE_HIERARCHY.CASHIER
  );

  if (cashierRecord && cashierRecord.status !== "Signed") {
    return {
      status: "ineligible",
      blockingDepartment: CLEARANCE_HIERARCHY.CASHIER,
      message: `Pending ${CLEARANCE_HIERARCHY.CASHIER} settlement`,
    };
  }

  // 3. Registrar needs EVERYTHING else to be settled
  if (currentDeptName === CLEARANCE_HIERARCHY.REGISTRAR) {
    const allOthersSigned = records
      .filter(r => (r as any).dept_name !== CLEARANCE_HIERARCHY.REGISTRAR)
      .every(r => r.status === "Signed");

    if (!allOthersSigned) {
      return {
        status: "ineligible",
        message: "Waiting for all other departments to sign",
      };
    }
  }

  return {
    status: "eligible",
    message: "Ready to sign",
  };
}

export interface ClientOverdueInfo {
  isOverdue: boolean;
  overduePhase: number | null;
  overduePhaseLabel: string | null;
  dwellHours: number;
}

/**
 * Computes whether a client (student or staff) is overdue (stalled in active phase for >= threshold hours).
 *
 * Rules:
 * 1. Fully cleared clients are never overdue.
 * 2. Staff clearances are parallel: dwell time is calculated from clearance creation against all unsigned offices.
 * 3. Student clearances are sequential by phase tiers:
 *    - Phase 1 dwell accumulates from clearance creation.
 *    - Phase N (N > 1) dwell begins ONLY when all preceding tiers (< N) are signed off.
 *    - Active tier is the lowest tier containing unsigned departments.
 *    - If dwell >= holdThresholdHours (default 24h), client is flagged Overdue for that phase.
 */
export function computeClientOverdueStatus(
  records: {
    status: string;
    tier?: number;
    signed_at?: string | null;
    created_at?: string | null;
    dept_name?: string;
  }[],
  isStaff: boolean = false,
  holdThresholdHours: number = 24,
  now: number = Date.now()
): ClientOverdueInfo {
  if (!records || records.length === 0 || records.every((r) => r.status === "Signed")) {
    return { isOverdue: false, overduePhase: null, overduePhaseLabel: null, dwellHours: 0 };
  }

  // Group by tier
  const tiers = Array.from(new Set(records.map((r) => r.tier ?? 1))).sort((a, b) => a - b);
  const minTier = tiers[0] ?? 1;

  // Find lowest incomplete tier
  const activeTier = tiers.find((t) => records.some((r) => (r.tier ?? 1) === t && r.status !== "Signed"));
  if (activeTier === undefined) {
    return { isOverdue: false, overduePhase: null, overduePhaseLabel: null, dwellHours: 0 };
  }

  let entryTime: number;
  if (activeTier === minTier) {
    const p1Records = records.filter((r) => (r.tier ?? 1) === minTier && r.status !== "Signed");
    const p1Timestamps = p1Records
      .map((r) => (r.created_at ? new Date(r.created_at).getTime() : 0))
      .filter((t) => t > 0);
    entryTime = p1Timestamps.length > 0 ? Math.min(...p1Timestamps) : now;
  } else {
    // Gate: All preceding tiers must be Signed
    const prevTierRecords = records.filter((r) => (r.tier ?? 1) < activeTier);
    const allPrevSigned = prevTierRecords.length > 0 && prevTierRecords.every((r) => r.status === "Signed");
    if (!allPrevSigned) {
      // Has not unlocked activeTier yet
      return { isOverdue: false, overduePhase: null, overduePhaseLabel: null, dwellHours: 0 };
    }
    const signedTimestamps = prevTierRecords
      .map((r) => (r.signed_at ? new Date(r.signed_at).getTime() : 0))
      .filter((t) => t > 0);
    let tierEntryTime = signedTimestamps.length > 0 ? Math.max(...signedTimestamps) : now;

    // Check if any unsigned record in active tier has an earlier created_at (simulated bottleneck)
    const activeTierRecords = records.filter((r) => (r.tier ?? 1) === activeTier && r.status !== "Signed");
    const activeTimestamps = activeTierRecords
      .map((r) => (r.created_at ? new Date(r.created_at).getTime() : 0))
      .filter((t) => t > 0);
    if (activeTimestamps.length > 0) {
      tierEntryTime = Math.min(tierEntryTime, ...activeTimestamps);
    }
    entryTime = tierEntryTime;
  }

  const dwellHours = Math.max(0, (now - entryTime) / 3600000);
  const isOverdue = dwellHours >= holdThresholdHours;

  const phaseLabel = isOverdue
    ? isStaff && tiers.length === 1
      ? "Staff"
      : `Phase ${activeTier}`
    : null;

  return {
    isOverdue,
    overduePhase: isOverdue ? activeTier : null,
    overduePhaseLabel: phaseLabel,
    dwellHours: Math.round(dwellHours),
  };
}

export function normalizeTimestamp(val?: string | null): string {
  if (!val || val === "Recently") return "";
  const d = new Date(val);
  const time = d.getTime();
  if (!isNaN(time) && time > 0) {
    return String(Math.floor(time / 1000));
  }
  return val.trim();
}

/**
 * Deterministic unique view/notification key for clearance tasks.
 * - For flagged tasks: scoped to `${taskId}_flagged_${uploadTimestamp}`.
 * - For rejected/returned tasks: scoped to `${taskId}_rejected_${uploadTimestamp}_${comment}`.
 * - For newly assigned tasks: key is `${taskId}_assigned`.
 */
export function getTaskViewKey(
  taskId: number,
  status?: string | null,
  uploadedAt?: string | null,
  comments?: string | null
): string {
  const normalized = (status || "").toLowerCase();
  const cleanUpload = normalizeTimestamp(uploadedAt);

  if (normalized === "flagged") {
    return cleanUpload ? `${taskId}_flagged_${cleanUpload}` : `${taskId}_flagged`;
  }

  if (normalized === "rejected" || normalized === "returned") {
    const cleanComment = comments ? comments.trim().slice(0, 40) : "";
    const parts = [cleanUpload, cleanComment].filter(Boolean).join("_");
    return parts ? `${taskId}_rejected_${parts}` : `${taskId}_rejected`;
  }

  return `${taskId}_assigned`;
}

/**
 * Checks whether a given task has been viewed in its current state.
 * - For flagged tasks: requires that the specific flagged key for this upload has been acknowledged.
 * - For rejected/returned tasks: requires that the specific rejection key for this upload has been acknowledged.
 *   (Viewing an AI-flagged task does NOT acknowledge a subsequent staff rejection).
 * - For pending/assigned tasks: acknowledged if `${taskId}_assigned` or plain `taskId` exists in viewedSet.
 */
export function isTaskViewed(
  taskId: number,
  status: string | null | undefined,
  viewedSet: Set<string | number>,
  uploadedAt?: string | null,
  comments?: string | null
): boolean {
  if (!taskId || taskId <= 0) return true;
  const normalized = (status || "").toLowerCase();

  if (normalized === "flagged") {
    const fullKey = getTaskViewKey(taskId, status, uploadedAt, comments);
    if (viewedSet.has(fullKey)) return true;
    const cleanUpload = normalizeTimestamp(uploadedAt);
    if (cleanUpload) {
      if (viewedSet.has(`${taskId}_flagged_${cleanUpload}`)) return true;
      for (const key of viewedSet) {
        if (typeof key === "string" && key.startsWith(`${taskId}_flagged_${cleanUpload}`)) {
          return true;
        }
      }
    }
    if (viewedSet.has(`${taskId}_flagged`)) {
      return true;
    }
    return false;
  }

  if (normalized === "rejected" || normalized === "returned") {
    const fullKey = getTaskViewKey(taskId, status, uploadedAt, comments);
    if (viewedSet.has(fullKey)) return true;
    const cleanUpload = normalizeTimestamp(uploadedAt);
    if (cleanUpload) {
      if (viewedSet.has(`${taskId}_rejected_${cleanUpload}`)) return true;
      for (const key of viewedSet) {
        if (typeof key === "string" && key.startsWith(`${taskId}_rejected_${cleanUpload}`)) {
          return true;
        }
      }
    }
    if (viewedSet.has(`${taskId}_rejected`)) {
      return true;
    }
    return false;
  }

  const assignedKey = `${taskId}_assigned`;
  return (
    viewedSet.has(assignedKey) ||
    viewedSet.has(taskId) ||
    viewedSet.has(String(taskId))
  );
}

/**
 * Checks if a task notification has already been acknowledged in the current browser session.
 */
export function isTaskNotificationAcknowledged(studentId: string, taskId: number): boolean {
  if (typeof window === "undefined" || !studentId || !taskId) return false;
  try {
    const raw = sessionStorage.getItem(`acked_task_notifs_${studentId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.includes(taskId)) return true;
    }
  } catch {}
  return false;
}

/**
 * Marks task notification IDs as acknowledged in the current browser session.
 */
export function markTaskNotificationAcknowledged(studentId: string, taskIds: number | number[]): void {
  if (typeof window === "undefined" || !studentId) return;
  try {
    const ids = Array.isArray(taskIds) ? taskIds : [taskIds];
    const key = `acked_task_notifs_${studentId}`;
    const raw = sessionStorage.getItem(key);
    const existing = new Set<number>(raw ? JSON.parse(raw) : []);
    ids.forEach((id) => {
      if (id > 0) existing.add(id);
    });
    sessionStorage.setItem(key, JSON.stringify(Array.from(existing)));
  } catch {}
}



