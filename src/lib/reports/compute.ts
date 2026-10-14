import type {
    ClearanceRecord,
    ClearanceReportSource,
    DepartmentSummary,
    PersonStatus,
    ReportRow,
    ReportScope,
    ReportView,
    SignoffStatus,
    StatusCounts,
    TemplateSummary,
  } from "./types";
  
  export const SCOPES: { value: ReportScope; label: string }[] = [
    { value: "all", label: "All" },
    { value: "staff", label: "Staff" },
    { value: "students", label: "Students" },
  ];
  
  const SCOPE_LABEL: Record<ReportScope, string> = {
    all: "All (staff and students)",
    staff: "Staff only",
    students: "Students only",
  };
  
  export const PERSON_STATUS_LABEL: Record<PersonStatus, string> = {
    cleared: "Cleared",
    pending: "Pending",
    incomplete: "Incomplete",
  };
  
  const percent = (part: number, whole: number) =>
    whole === 0 ? 0 : Math.round((part / whole) * 100);
  
  /**
   * THE rule for a person's overall status. Change it here and the charts, KPIs,
   * table and PDF all follow.
   *   - cleared:        every department approved
   *   - incomplete:     at least one department signed
   *   - pending: no progress
   */
  export function overallStatus(statuses: SignoffStatus[]): PersonStatus {
    if (statuses.every((s) => s === "signed")) return "cleared";
    if (statuses.some((s) => s === "incomplete")) return "incomplete";
    return "pending";
  }
  
  function toRow(record: ClearanceRecord): ReportRow {
    return {
      id: record.id,
      name: record.name,
      idNumber: record.idNumber,
      templateCode: record.templateCode,
      status: overallStatus(record.signoffs.map((s) => s.status)),
      outstanding: record.signoffs.flatMap((s) =>
        s.status === "signed" ? [] : [{ department: s.department, status: s.status }],
      ),
    };
  }
  
  function countRows(rows: ReportRow[]): StatusCounts {
    const cleared = rows.filter((r) => r.status === "cleared").length;
    return {
      total: rows.length,
      cleared,
      pending: rows.filter((r) => r.status === "pending").length,
      incomplete: rows.filter((r) => r.status === "incomplete").length,
      rate: percent(cleared, rows.length),
    };
  }
  
  /**
   * Builds everything the page and the PDF display for one scope. Both consumers
   * call this, so the screen and the PDF can never disagree.
   */
  export function buildReportView(
    source: ClearanceReportSource,
    scope: ReportScope = "all",
  ): ReportView {
    const templates = source.templates.filter(
      (t) => scope === "all" || (scope === "staff" ? t.kind === "staff" : t.kind === "student"),
    );
  
    const order = new Map(templates.map((t, i) => [t.code, i]));
    const records = source.records.filter((r) => order.has(r.templateCode));
  
    const rows = records
      .map(toRow)
      .sort(
        (a, b) =>
          (order.get(a.templateCode) ?? 0) - (order.get(b.templateCode) ?? 0) ||
          a.name.localeCompare(b.name),
      );
  
    const templateSummaries: TemplateSummary[] = templates.map((t) => ({
      ...t,
      ...countRows(rows.filter((r) => r.templateCode === t.code)),
    }));
  
    const byDepartment = new Map<string, DepartmentSummary>();
    for (const record of records) {
      for (const { department, status } of record.signoffs) {
        const entry = byDepartment.get(department) ?? {
          department,
          approved: 0,
          pending: 0,
          incomplete: 0,
          total: 0,
        };
        if (status === "signed") entry.approved += 1;
        else if (status === "pending") entry.pending += 1;
        else entry.incomplete += 1;
        entry.total += 1;
        byDepartment.set(department, entry);
      }
    }
  
    return {
      scope,
      scopeLabel: SCOPE_LABEL[scope],
      totals: countRows(rows),
      templates: templateSummaries,
      departments: [...byDepartment.values()].sort((a, b) => a.department.localeCompare(b.department)),
      rows,
    };
  }