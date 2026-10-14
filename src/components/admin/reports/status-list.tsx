"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PERSON_STATUS_LABEL } from "@/lib/reports/compute";
import type { PersonStatus, ReportRow } from "@/lib/reports/types";

const PAGE_SIZE = 12;

type StatusFilter = "all" | PersonStatus;

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "cleared", label: PERSON_STATUS_LABEL.cleared },
  { value: "pending", label: PERSON_STATUS_LABEL.pending },
  { value: "incomplete", label: PERSON_STATUS_LABEL.incomplete },
];

interface StatusListProps {
  rows: ReportRow[];
  departments: string[];
}

/**
 * Its filters are local on purpose: they help the admin chase people down but
 * do not affect the charts or the exported PDF. The parent passes
 * `key={scope}` so this resets when the scope changes.
 */
export function StatusList({ rows, departments }: StatusListProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [department, setDepartment] = useState("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (department === "all" || r.outstanding.some((o) => o.department === department)) &&
        (!q || r.name.toLowerCase().includes(q) || r.idNumber.includes(q)),
    );
  }, [rows, query, status, department]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : current * PAGE_SIZE + 1;
  const to = Math.min((current + 1) * PAGE_SIZE, filtered.length);

  return (
    <div>
      <div className="flex flex-col gap-3 pb-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-xs">
          <Search className="rp-muted pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search name or ID number..."
            aria-label="Search name or ID number"
            className="rp-input w-full pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Filter by status" className="rp-segment">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                aria-pressed={status === tab.value}
                onClick={() => {
                  setStatus(tab.value);
                  setPage(0);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(0);
            }}
            aria-label="Show only people with an outstanding sign-off at a department"
            className="rp-input"
          >
            <option value="all">Outstanding at: any department</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                Outstanding at: {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rp-table-wrap overflow-x-auto">
        <table className="rp-table w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Name</th>
              <th scope="col" className="px-4 py-3 font-medium">ID number</th>
              <th scope="col" className="px-4 py-3 font-medium">Template</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Outstanding sign-offs</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="rp-muted px-4 py-3 tabular-nums">{row.idNumber}</td>
                <td className="rp-muted px-4 py-3">{row.templateCode === "STAFF" ? "Staff" : row.templateCode}</td>
                <td className="px-4 py-3">
                  <span className={`rp-badge rp-badge--${row.status}`}>{PERSON_STATUS_LABEL[row.status]}</span>
                </td>
                <td className="px-4 py-3">
                  {row.outstanding.length === 0 ? (
                    <span className="rp-muted">None</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {row.outstanding.map((o) => (
                        <span key={o.department} className={`rp-chip ${o.status === "incomplete" ? "rp-chip--incomplete" : ""}`}>
                          {o.department}
                          {o.status === "incomplete" && " (incomplete)"}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="rp-muted px-4 py-10 text-center">
                  No one matches these filters. Clear the search or pick a different status.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rp-muted flex items-center justify-between pt-4 text-sm">
        <p>
          Showing {from}-{to} of {filtered.length}
        </p>
        <div className="flex items-center gap-2">
          <button type="button" className="rp-btn" onClick={() => setPage(current - 1)} disabled={current === 0}>
            Previous
          </button>
          <span className="tabular-nums">
            {current + 1} / {pageCount}
          </span>
          <button type="button" className="rp-btn" onClick={() => setPage(current + 1)} disabled={current >= pageCount - 1}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}