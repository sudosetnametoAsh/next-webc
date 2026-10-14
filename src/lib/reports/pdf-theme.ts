/**
 * PDF palette. Deliberately independent of the app theme: the export is an
 * archival/print document, so it is always light. On-screen colors live in
 * components/reports/reports.css.
 */
export const PDF_COLORS = {
    text: "#0f172a",
    muted: "#64748b",
    border: "#e2e8f0",
    track: "#e5e7eb",
    surface: "#f8fafc",
    zebra: "#fafbfc",
    navy: "#0b192c",
    amber: "#ffb900",
    approved: "#059669",
    pendingReview: "#64748b",
    pendingReviewText: "#475569",
    incomplete: "#f59e0b",
    incompleteText: "#b45309",
  } as const;