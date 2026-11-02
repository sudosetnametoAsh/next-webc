export type SigningEligibilityStatus = 'eligible' | 'ineligible' | 'already_signed';

/**
 * Interface for clearance signing eligibility notifications.
 * Used in the BreadCrumb/Topbar to indicate when students or courses
 * are ready to be signed by the current department staff.
 */
export interface SigningEligibility {
  /**
   * Whether the target (student, course, or staff) can be signed by the current department.
   */
  status: SigningEligibilityStatus;
  
  /**
   * Descriptive message explaining the eligibility status.
   * e.g., "Pending Cashier settlement" or "Ready to sign"
   */
  message?: string;

  /**
   * For bulk actions, the number of entities (students/staff) that are eligible.
   */
  eligibleCount?: number;

  /**
   * The name of the department that must sign before the current one (if applicable).
   */
  blockingDepartment?: string;
}

/**
 * Interface for the notification objects displayed in the UI.
 */
export interface ClearanceNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'signing_eligible' | 'task_submitted' | 'info' | 'system' | 'warning' | 'success' | 'alert' | 'appeal' | string;
  category?: 'task' | 'submission' | 'clearance' | 'schedule' | 'template' | 'bottleneck' | 'completion' | 'system' | 'appeal' | string;
  targetRole?: 'student' | 'department' | 'admin' | string;
  departmentId?: number;
  userId?: string;
  read: boolean;
  metadata?: {
    studentId?: string;
    studentName?: string;
    clearanceId?: string;
    sectionId?: number;
    courseId?: number;
    courseCode?: string;
    taskId?: number;
    taskTitle?: string;
    departmentName?: string;
    bottleneckRate?: number;
    refUrl?: string;
    [key: string]: any;
  };
}

/**
 * Rules for the clearance signing hierarchy:
 * 1. Tier 1: Main priority (e.g. Cashier). Must be settled before higher tiers can sign.
 * 2. Intermediate Tiers (e.g. Tier 2): Can sign in parallel once lower tiers are cleared.
 * 3. Final Tier (e.g. Tier 3 Registrar): Requires all preceding tiers to be signed.
 * 4. Staff Clearances: Parallel / no hierarchy by default.
 */
export const CLEARANCE_HIERARCHY = {
  CASHIER: "Cashier",
  REGISTRAR: "Registrar",
} as const;

export interface ClearanceRecordWithTier {
  clearance_id?: number | string;
  dept_id?: number;
  dept_name?: string;
  status: string;
  tier: number;
}
