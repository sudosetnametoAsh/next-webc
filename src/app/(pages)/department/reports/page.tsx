import { createClient } from "@/lib/db/supabase-server";
import React from "react";
import { getSession } from "@/lib/auth/get-session";

/* ═══════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════ */
type ClearanceRow = {
  user_id: string;
  status: string;
  signed_at: string | null;
  clearance_templates: {
    course_id: number;
    courses: { course_name: string } | null;
  } | null;
};

type EnrollmentRow = {
  student_id: string;
  course_sections: {
    section_number: number;
    year: number;
    semester: number;
    course_id: number;
  } | null;
};

type SectionStat = {
  label: string;
  total: number;
  signed: number;
  pending: number;
  incomplete: number;
};

type ProgramStat = {
  program: string;
  total: number;
  signed: number;
  pending: number;
  incomplete: number;
  sections: SectionStat[];
};

/* ═══════════════════════════════════════════════════════════════════════
   Page — Server Component
   ═══════════════════════════════════════════════════════════════════════ */
export default async function Reports() {
  const supabase = await createClient();
  const {user_id} = await getSession();
  const staffId = user_id;

  /* ── 1. Clearances scoped to this staff's templates ───────────────── */
  const { data: clearances, error: cErr } = await supabase
    .from("clearance_records")
    .select(
      "status, signed_at, user_id, clearance_templates!inner(course_id, courses(course_name))"
    )
    .eq("clearance_templates.staff_id", staffId);

  if (cErr) {
    console.error("Failed to fetch clearances:", cErr);
    throw new Error("Failed to load report data");
  }

  const rows: ClearanceRow[] = clearances || [];

  /* ── 2. Fetch section enrollments for these students + courses ────── */
  const studentIds = [...new Set(rows.map((c) => c.user_id))];
  const courseIds = [
    ...new Set(
      rows.map((c) => c.clearance_templates?.course_id).filter(Boolean) as number[]
    ),
  ];

  const enrollmentLookup = new Map<
    string,
    { sectionNumber: number; year: number; semester: number }
  >();

  if (studentIds.length > 0 && courseIds.length > 0) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select(
        "student_id, course_sections!inner(section_number, year, semester, course_id)"
      )
      .in("student_id", studentIds)
      .in("course_sections.course_id", courseIds);

    if (enrollments) {
      for (const e of enrollments as EnrollmentRow[]) {
        if (e.course_sections) {
          enrollmentLookup.set(`${e.student_id}-${e.course_sections.course_id}`, {
            sectionNumber: e.course_sections.section_number,
            year: e.course_sections.year,
            semester: e.course_sections.semester,
          });
        }
      }
    }
  }

  /* ── 3. Assigned tasks for "Tasks to Review" card ─────────────────── */
  const { data: tasks } = await supabase
    .from("clearance_tasks")
    .select("status")
    .eq("staff_id", staffId);

  const tasksToReview = (tasks || []).filter((t) => t.status === "Pending").length;

  /* ── Stat card values ─────────────────────────────────────────────── */
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString();
  const tomorrowStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  ).toISOString();

  const clearedToday = rows.filter(
    (c) =>
      c.status === "Signed" &&
      c.signed_at &&
      c.signed_at >= todayStart &&
      c.signed_at < tomorrowStart
  ).length;

  const counts = { Signed: 0, Pending: 0, Incomplete: 0 };
  for (const c of rows) {
    if (c.status in counts) counts[c.status as keyof typeof counts]++;
  }

  /* ── Daily throughput (last 7 days, cleared only) ─────────────────── */
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daily: { day: string; cleared: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const ds = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    const de = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
    const cleared = rows.filter(
      (c) =>
        c.status === "Signed" && c.signed_at && c.signed_at >= ds && c.signed_at < de
    ).length;
    daily.push({ day: dayLabels[d.getDay()], cleared });
  }

  const maxVal = Math.max(...daily.map((d) => d.cleared), 1);
  const step = Math.ceil(maxVal / 4);
  const yAxisLabels = [step * 4, step * 3, step * 2, step, 0];

  /* ── Donut chart values ───────────────────────────────────────────── */
  const total = counts.Signed + counts.Pending + counts.Incomplete;
  const clearedPct = total > 0 ? Math.round((counts.Signed / total) * 100) : 0;
  const incompletePct =
    total > 0
      ? Math.min(
          Math.round((counts.Incomplete / total) * 100),
          100 - clearedPct
        )
      : 0;

  /* ── Program + Section breakdown ──────────────────────────────────── */
  const programMap = new Map<string, ProgramStat>();
  const sectionMap = new Map<string, SectionStat>();

  for (const c of rows) {
    const programName = c.clearance_templates?.courses?.course_name || "Unassigned";
    const courseId = c.clearance_templates?.course_id;

    if (!programMap.has(programName)) {
      programMap.set(programName, {
        program: programName,
        total: 0,
        signed: 0,
        pending: 0,
        incomplete: 0,
        sections: [],
      });
    }
    const p = programMap.get(programName)!;
    p.total++;
    if (c.status === "Signed") p.signed++;
    else if (c.status === "Pending") p.pending++;
    else if (c.status === "Incomplete") p.incomplete++;

    // Resolve section from enrollment lookup
    const sKey = `${c.user_id}-${courseId}`;
    const sInfo = enrollmentLookup.get(sKey);
    if (sInfo) {
      const label = `Section ${sInfo.sectionNumber} · ${sInfo.year} · Sem ${sInfo.semester}`;
      const mapKey = `${programName}|||${label}`;
      if (!sectionMap.has(mapKey)) {
        sectionMap.set(mapKey, { label, total: 0, signed: 0, pending: 0, incomplete: 0 });
      }
      const s = sectionMap.get(mapKey)!;
      s.total++;
      if (c.status === "Signed") s.signed++;
      else if (c.status === "Pending") s.pending++;
      else if (c.status === "Incomplete") s.incomplete++;
    }
  }

  // Attach sections to their parent program
  for (const [mapKey, section] of sectionMap) {
    const [programName] = mapKey.split("|||");
    programMap.get(programName)?.sections.push(section);
  }

  const programs = Array.from(programMap.values()).sort((a, b) => b.total - a.total);

  /* ═══════════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <section className="mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Daily clearance performance and student breakdown
          </p>
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Cleared Today"
          value={clearedToday}
          icon={<CheckCircleIcon />}
          iconBg="border-emerald-100 bg-emerald-50 text-emerald-500"
          valueColor="text-gray-900"
        />
        <StatCard
          label="Clearances Pending"
          value={counts.Pending}
          icon={<ClockIcon />}
          iconBg="border-blue-100 bg-blue-50 text-blue-500"
          valueColor="text-gray-900"
          subtitle="Awaiting student action"
          subtitleColor="text-gray-500"
        />
        <StatCard
          label="Tasks to Review"
          value={tasksToReview}
          icon={<ClipboardIcon />}
          iconBg="border-amber-100 bg-amber-50 text-amber-500"
          valueColor="text-amber-600"
          subtitle={tasksToReview > 0 ? "Requires your review" : "All caught up"}
          subtitleColor={tasksToReview > 0 ? "text-amber-500" : "text-emerald-500"}
        />
        <StatCard
          label="Total Cleared"
          value={counts.Signed}
          icon={<TrendUpIcon />}
          iconBg="border-emerald-100 bg-emerald-50 text-emerald-500"
          valueColor="text-gray-900"
          subtitle={`${clearedPct}% of ${total} total`}
          subtitleColor="text-gray-400"
        />
      </div>

      {/* ── Charts Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Throughput */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <BarChartIcon />
                Daily Throughput
              </h2>
              <p className="text-xs text-gray-500 mt-1">Students cleared per day (last 7 days)</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium border border-gray-200 rounded px-2 py-1 bg-gray-50">
                Last 7 Days
              </span>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cleared
              </div>
            </div>
          </div>

          <div className="relative h-64 mt-4 flex items-end justify-between gap-2 px-2">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
              {yAxisLabels.map((val, i) => (
                <div key={i} className="flex items-center w-full">
                  <span className="text-xs text-gray-400 w-6 text-right mr-3">{val}</span>
                  <div className="flex-1 border-b border-dashed border-gray-200" />
                </div>
              ))}
            </div>
            <div className="relative w-full h-[calc(100%-2rem)] flex items-end justify-around pl-8 z-10">
              {daily.map((d) => (
                <div key={d.day} className="flex flex-col items-center w-full h-full justify-end">
                  <div className="flex items-end h-full pb-8 w-full justify-center">
                    <div
                      className="w-6 md:w-10 bg-emerald-500 rounded-t-sm hover:opacity-80 transition-opacity"
                      style={{
                        height: d.cleared > 0 ? `${(d.cleared / maxVal) * 100}%` : "0",
                        minHeight: d.cleared > 0 ? "4px" : "0",
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 absolute bottom-0">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overall Status Donut */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex flex-col h-full">
          <div className="mb-2">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <ClockDashboardIcon />
              Overall Status
            </h2>
            <p className="text-xs text-gray-500 mt-1">Distribution of your clearances</p>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="relative flex justify-center items-center my-4">
              <svg viewBox="-3 -3 42 42" className="w-48 h-48 transform -rotate-90">
                {/* Background ring (Pending) */}
                <path
                  className="text-slate-100"
                  strokeDasharray="100, 100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                />
                {/* Cleared segment */}
                <path
                  className="text-emerald-500"
                  strokeDasharray={`${clearedPct}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                />
                {/* Incomplete segment (starts after Cleared) */}
                {incompletePct > 0 && (
                  <path
                    className="text-amber-500"
                    strokeDasharray={`${incompletePct}, 100`}
                    strokeDashoffset={`-${clearedPct}`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="7"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{clearedPct}%</span>
                <span className="text-[10px] text-gray-500 font-medium">Cleared</span>
              </div>
            </div>

            <div className="flex justify-center gap-4 text-[11px] font-medium w-full">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-gray-500">
                  Cleared <span className="text-gray-900 font-bold ml-1">{counts.Signed}</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-gray-500">
                  Incomplete{" "}
                  <span className="text-gray-900 font-bold ml-1">{counts.Incomplete}</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                <span className="text-gray-500">
                  Pending{" "}
                  <span className="text-gray-900 font-bold ml-1">{counts.Pending}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Students Breakdown by Program ────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
        <div className="p-6 pb-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <PulseIcon />
            Students Breakdown by Program
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Clearance status grouped by program — click to expand sections
          </p>
        </div>

        <div className="overflow-x-auto">
          {/* Column headers — using grid so they align with the rows below */}
          <div className="min-w-[700px] grid grid-cols-[1fr_72px_72px_72px_88px_1fr] gap-0 border-b border-gray-100 px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Program</span>
            <span className="text-center">Total</span>
            <span className="text-center">Cleared</span>
            <span className="text-center">Pending</span>
            <span className="text-center">Incomplete</span>
            <span className="text-center pl-2">Completion</span>
          </div>

          <div className="min-w-[700px]">
            {programs.length === 0 && (
              <div className="px-6 py-12 text-center text-gray-400 text-sm">
                No clearance data yet for your assigned templates.
              </div>
            )}

            {programs.map((p) => {
              const pct = p.total > 0 ? Math.round((p.signed / p.total) * 100) : 0;
              return (
                <details key={p.program} className="group">
                  {/* Program row (acts as the clickable summary) */}
                  <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer hover:bg-gray-50/50 transition-colors">
                    <div className="grid grid-cols-[1fr_72px_72px_72px_88px_1fr] gap-0 items-center px-6 py-4 border-b border-gray-50">
                      <div className="flex items-center gap-2 min-w-0">
                        <svg
                          className="w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 group-open:rotate-90"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                        <span className="font-medium text-gray-900 truncate">{p.program}</span>
                      </div>
                      <span className="text-center text-gray-700">{p.total}</span>
                      <span className="text-center font-medium text-emerald-600">{p.signed}</span>
                      <span className="text-center text-gray-500">{p.pending}</span>
                      <span className="text-center text-amber-500">{p.incomplete}</span>
                      <div className="flex items-center gap-2 px-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 w-9 text-right">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  </summary>

                  {/* Expanded section rows */}
                  <div className="bg-gray-50/40 border-b border-gray-100">
                    {p.sections.length === 0 && (
                      <div className="px-6 pl-14 py-3 text-sm text-gray-400 italic">
                        No section enrollment data found
                      </div>
                    )}
                    {p.sections.map((s) => {
                      const sPct =
                        s.total > 0 ? Math.round((s.signed / s.total) * 100) : 0;
                      return (
                        <div
                          key={s.label}
                          className="grid grid-cols-[1fr_72px_72px_72px_88px_1fr] gap-0 items-center px-6 pl-14 py-3 border-b border-gray-100/60 last:border-b-0 hover:bg-white/60 transition-colors"
                        >
                          <span className="text-sm text-gray-500 truncate">{s.label}</span>
                          <span className="text-center text-sm text-gray-600">{s.total}</span>
                          <span className="text-center text-sm font-medium text-emerald-600">
                            {s.signed}
                          </span>
                          <span className="text-center text-sm text-gray-400">{s.pending}</span>
                          <span className="text-center text-sm text-amber-400">
                            {s.incomplete}
                          </span>
                          <div className="flex items-center gap-2 px-2">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-400 rounded-full transition-all"
                                style={{ width: `${sPct}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-400 w-9 text-right">
                              {sPct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Reusable Stat Card
   ═══════════════════════════════════════════════════════════════════════ */
function StatCard({
  label,
  value,
  icon,
  iconBg,
  valueColor,
  subtitle,
  subtitleColor = "text-gray-500",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  valueColor: string;
  subtitle?: string;
  subtitleColor?: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex justify-between items-start">
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</h3>
        <div className={`text-3xl font-bold ${valueColor}`}>{value}</div>
        {subtitle && <span className={`text-xs font-medium ${subtitleColor}`}>{subtitle}</span>}
      </div>
      <div className={`p-2 border rounded-full ${iconBg}`}>{icon}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Small Icon Components (kept local to avoid extra imports)
   ═══════════════════════════════════════════════════════════════════════ */
function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
    </svg>
  );
}

function ClockDashboardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
