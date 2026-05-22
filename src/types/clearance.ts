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
  type: 'signing_eligible' | 'task_submitted' | 'info';
  read: boolean;
  metadata?: {
    studentId?: string;
    clearanceId?: string;
    sectionId?: number;
    courseId?: number;
    refUrl?: string;
  };
}

/**
 * Rules for the clearance signing hierarchy:
 * 1. Cashier: Main priority. Must be settled before any other department can sign.
 * 2. Registrar: Always last. Requires all other departments to be signed.
 * 3. Others: Can sign in any order once Cashier is settled.
 * 4. Staff Clearances: No specific order required.
 */
export const CLEARANCE_HIERARCHY = {
  CASHIER: "Cashier",
  REGISTRAR: "Registrar",
} as const;
