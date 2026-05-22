import { CLEARANCE_HIERARCHY, SigningEligibility } from "@/types/clearance";
import { Students } from "@/types/students";

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

  // NOTE: This logic assumes we have access to other department records.
  // If the API only returns the current department's record, this logic 
  // would need to be moved to the backend or the API must be expanded.
  
  // Implementation of hierarchy rules:
  
  // 1. Cashier is always eligible
  if (currentDeptName === CLEARANCE_HIERARCHY.CASHIER) {
    return {
      status: "eligible",
      message: "Ready to sign (Priority: Cashier)",
    };
  }

  // 2. Others need Cashier to be settled
  // We'd need to find the Cashier record in the list
  const cashierRecord = records.find(r => 
    // This is pseudo-code as we don't have dept_name in the Students type yet
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
