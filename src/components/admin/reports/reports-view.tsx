"use client";

import "@/components/admin/reports/reports.css";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { BookOpen, Building2, CircleAlert, CircleCheck, Clock, Download, FileText, Loader2, Users } from "lucide-react";
import { SCOPES, buildReportView } from "@/lib/reports/compute";
import type { ClearanceReportSource, ReportScope } from "@/lib/reports/types";
import { CompletionChart, DepartmentChart } from "@/components/admin/reports/report-charts";
import { downloadReportPdf } from "@/components/admin/reports/download-report-pdf";
import { StatusList } from "@/components/admin/reports/status-list";

interface ReportsViewProps {
  source: ClearanceReportSource;
  /** Admin's display name, printed on the PDF. Wire this to your session. */
  generatedBy?: string;
  /** Public path to a PNG/JPG logo for the PDF header, e.g. "/logo.png". Skipped silently if missing. */
  logoSrc?: string;
}

export function ReportsView({ source, generatedBy, logoSrc }: ReportsViewProps) {
  const [scope, setScope] = useState<ReportScope>("all");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const view = useMemo(() => buildReportView(source, scope), [source, scope]);
  const { totals } = view;

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      await downloadReportPdf({ term: source.term, view, generatedBy, logoSrc });
    } catch (err) {
      console.error(err);
      setError("The PDF could not be generated. Try again, and check the browser console if it keeps failing.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="reports-root mx-auto w-full max-w-7xl space-y-8">
      {/* Header */}
      <header className="rp-divider flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clearance Reports</h1>
          <p className="rp-muted mt-1 text-sm">
            Completion progress, department sign-offs, and per-person status for {source.term}
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || totals.total === 0}
          className="rp-btn-primary inline-flex h-9 shrink-0 items-center gap-2 px-4 text-sm"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
          {exporting ? "Generating PDF..." : "Export PDF"}
        </button>
      </header>

      {error && (
        <p role="alert" className="rp-alert px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {/* Scope filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Report scope" className="rp-segment self-start">
          {SCOPES.map((s) => (
            <button key={s.value} type="button" aria-pressed={scope === s.value} onClick={() => setScope(s.value)}>
              {s.label}
            </button>
          ))}
        </div>
        <p className="rp-muted text-sm">
          The PDF includes everything shown for: {view.scopeLabel}. Templates are removed when the semester ends, so
          export a copy first.
        </p>
      </div>

      {/* KPIs (same pattern as the Dashboard stat cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Users} label="Total in scope" badge={SCOPES.find((s) => s.value === scope)?.label ?? ""} value={totals.total} caption="People in this report" />
        <Kpi icon={CircleCheck} tone="cleared" label="Fully cleared" badge={`${totals.rate}%`} value={totals.cleared} caption="All departments endorsed" />
        <Kpi icon={CircleAlert} tone="warn" label="Incomplete" badge="Hold" value={totals.incomplete} caption="Waiting other staff signature" />
        <Kpi icon={Clock} label="Pending" badge="In Queue" value={totals.pending} caption="Awaiting staff signature" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel icon={BookOpen} title="Completion by Template" aside="Share fully cleared">
          <CompletionChart data={view.templates} />
        </Panel>
        <Panel icon={Building2} title="Department Sign-offs" aside="Per requirement">
          <DepartmentChart data={view.departments} />
        </Panel>
      </div>

      {/* Status list */}
      <Panel icon={FileText} title="Clearance Status List" aside="Filters here only change this table">
        <StatusList key={scope} rows={view.rows} departments={view.departments.map((d) => d.department)} />
      </Panel>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  aside,
  children,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  aside?: string;
  children: ReactNode;
}) {
  return (
    <section className="rp-card" aria-label={title}>
      <div className="rp-card-head flex items-center justify-between gap-3 border-b px-6 py-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Icon className="rp-muted h-4 w-4" aria-hidden />
          {title}
        </h2>
        {aside && <span className="rp-muted text-xs">{aside}</span>}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Kpi({
  icon: Icon,
  label,
  badge,
  value,
  caption,
  tone,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  badge: string;
  value: number;
  caption: string;
  tone?: "cleared" | "warn";
}) {
  return (
    <div className={`rp-card p-5 ${tone ? `rp-kpi--${tone}` : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </p>
        <span className="rp-pill">{badge}</span>
      </div>
      <p className="mt-3 text-4xl font-bold tabular-nums">{value}</p>
      <p className="rp-kpi-caption mt-1 text-xs">{caption}</p>
    </div>
  );
}