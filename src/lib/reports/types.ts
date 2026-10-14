/**
 * Raw shapes your backend should return, plus the derived shapes the UI and
 * PDF consume. Aggregates are computed on the client from raw records
 * (see compute.ts), so the API only has to return one flat list.
 */

/** Status of ONE department's sign-off for ONE person. */
export type SignoffStatus =
  | "signed"
  | "pending" // no progress
  | "incomplete"; // at least one (1) department signed

/** Overall status of one person across all their departments. */
export type PersonStatus = "cleared" | "pending" | "incomplete";

export type ReportScope = "all" | "staff" | "students";

export interface Signoff {
  department: string;
  status: SignoffStatus;
}

/** One clearance template card on the Templates page (Staff or a course). */
export interface ClearanceTemplateInfo {
  code: string; // "STAFF" | "BSCS" | "BSIT" | ...
  name: string; // "Bachelor of Science in Computer Science"
  kind: "student" | "staff";
}

/** One student or staff member and their sign-off from each assigned department. */
export interface ClearanceRecord {
  id: string;
  name: string;
  idNumber: string;
  templateCode: string;
  signoffs: Signoff[];
}

export interface ClearanceReportSource {
  term: string; // "1st Semester, A.Y. 2026-2027"
  templates: ClearanceTemplateInfo[];
  records: ClearanceRecord[];
}

/* ------------------------------ Derived ------------------------------ */

export interface OutstandingSignoff {
  department: string;
  status: Exclude<SignoffStatus, "approved">;
}

export interface ReportRow {
  id: string;
  name: string;
  idNumber: string;
  templateCode: string;
  status: PersonStatus;
  outstanding: OutstandingSignoff[];
}

export interface StatusCounts {
  total: number;
  cleared: number;
  pending: number;
  incomplete: number;
  /** Whole-number percentage of `total` that is cleared, 0-100. */
  rate: number;
}

export interface TemplateSummary extends ClearanceTemplateInfo, StatusCounts {}

export interface DepartmentSummary {
  department: string;
  approved: number;
  pending: number;
  incomplete: number;
  total: number;
}

export interface ReportView {
  scope: ReportScope;
  scopeLabel: string;
  totals: StatusCounts;
  templates: TemplateSummary[];
  departments: DepartmentSummary[];
  rows: ReportRow[];
}