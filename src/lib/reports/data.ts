import type { ClearanceReportSource } from "@/lib/reports/types";

/**
 * Fetches clearance report data from the backend API.
 * Returns the complete data source for client-side aggregation.
 */
export async function getReportSource(): Promise<ClearanceReportSource> {
  const response = await fetch('/api/admin/reports/clearance-source', {
    cache: 'no-store', // Ensure fresh data on each page load
  });

  if (!response.ok) {
    throw new Error('Failed to fetch clearance report data');
  }

  const { data } = await response.json();
  return data;
}