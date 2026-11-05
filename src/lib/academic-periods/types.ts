export interface AcademicPeriod {
  period_id: number;
  state: "preparing" | "open" | "ended";
  opens_at: string | null;
  start_requested_at: string | null;
  ended_at: string | null;
  source_period_id: number | null;
  start_year: number;
  end_year: number;
  term: number;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
  activated_at: string | null;
  created_at: string;
}

export function academicPeriodLabel(period: Pick<AcademicPeriod, 'start_year' | 'end_year' | 'term'>) {
  return `A.Y. ${period.start_year}–${period.end_year} · Term ${period.term}`;
}

export function effectivePeriodState(period: AcademicPeriod) {
  return period.state === 'preparing' && period.start_requested_at && period.opens_at && Date.parse(period.opens_at) <= Date.now() ? 'open' : period.state;
}
export interface CarryCandidate {
  id: string; name: string; email: string | null; detail: string | null;
  course_id?: number; course_name?: string; section_id?: number; section_number?: number;
  course_year?: number; semester?: number;
  departments?: Array<{ clearance_id: number; dept_id: number; dept_name: string; tier: number; status: 'Pending' | 'Signed' | 'Incomplete'; created_at: string | null; signed_at: string | null }>;
}
export interface CarryCandidates {
  source_period_id: number | null;
  students: CarryCandidate[];
  staff: CarryCandidate[];
  templates: Array<{ template_id: number; staff_id: string; department: string }>;
}
export interface TermConfiguration {
  period_id?: number;
  start_year: number;
  end_year: number;
  term: number;
  opens_at: string | null;
  source_period_id: number | null;
  student_ids: string[];
  staff_ids: string[];
  carry_templates: boolean;
}
