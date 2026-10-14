"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DepartmentSummary, TemplateSummary } from "@/lib/reports/types";

/*
 * Colors are CSS variables (defined in reports.css), so the charts follow the
 * light/dark toggle instantly with no re-render or theme hook.
 */
const tick = { fill: "var(--rp-muted)", fontSize: 12 };
const axisLine = false;
const tickLine = false;
const cursor = { fill: "var(--rp-cursor)" };

function EmptyChart() {
  return (
    <div className="rp-muted flex h-full min-h-48 items-center justify-center text-sm">
      No data to chart for this selection.
    </div>
  );
}

/** Completion rate (%) per template. */
export function CompletionChart({ data }: { data: TemplateSummary[] }) {
  if (data.length === 0) return <EmptyChart />;

  const chartData = data.map((t) => ({
    name: t.kind === "staff" ? "Staff" : t.code,
    rate: t.rate,
    cleared: t.cleared,
    total: t.total,
  }));

  return (
    <div className="h-72 w-full" role="img" aria-label="Bar chart of clearance completion rate per template">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--rp-grid)" />
          <XAxis dataKey="name" tick={tick} tickLine={tickLine} axisLine={axisLine} />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={tick}
            tickLine={tickLine}
            axisLine={axisLine}
          />
          <Tooltip
            cursor={cursor}
            content={({ active, payload }) => {
              const point = active ? payload?.[0]?.payload : undefined;
              if (!point) return null;
              return (
                <div className="rp-tooltip">
                  <p className="font-semibold">{point.name}</p>
                  <p className="rp-muted">
                    {point.cleared} of {point.total} cleared ({point.rate}%)
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="rate" fill="var(--rp-bar)" radius={[4, 4, 0, 0]} maxBarSize={56}>
            <LabelList
              dataKey="rate"
              position="top"
              formatter={(v: unknown) => `${v}%`}
              fontSize={12}
              fill="var(--rp-text)"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Approved / pending review / incomplete sign-offs per department. */
export function DepartmentChart({ data }: { data: DepartmentSummary[] }) {
  if (data.length === 0) return <EmptyChart />;

  return (
    <div
      className="w-full"
      style={{ height: Math.max(288, data.length * 40 + 64) }}
      role="img"
      aria-label="Stacked bar chart of approved, pending review and incomplete sign-offs per department"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--rp-grid)" />
          <XAxis type="number" allowDecimals={false} tick={tick} tickLine={tickLine} axisLine={axisLine} />
          <YAxis
            type="category"
            dataKey="department"
            width={132}
            tick={{ ...tick, fill: "var(--rp-text)" }}
            tickLine={tickLine}
            axisLine={axisLine}
          />
          <Tooltip
            cursor={cursor}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rp-tooltip">
                  <p className="mb-1 font-semibold">{label}</p>
                  {payload.map((p) => (
                    <p key={String(p.dataKey)} className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: p.color }}
                      />
                      <span className="rp-muted">{p.name}:</span> {p.value}
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Legend
            iconType="circle"
            formatter={(value) => <span style={{ color: "var(--rp-muted)", fontSize: 12 }}>{value}</span>}
          />
          <Bar dataKey="approved" name="Approved" stackId="s" fill="var(--rp-approved)" />
          <Bar dataKey="pending" name="Pending" stackId="s" fill="var(--rp-review)" />
          <Bar dataKey="incomplete" name="Incomplete" stackId="s" fill="var(--rp-incomplete)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}