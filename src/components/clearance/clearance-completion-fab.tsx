"use client";

import React, { useState } from "react";
import { useClearanceData } from "@/hooks/clearance/use-clearance-data";
import { exportClearancePDF } from "@/utils/export-clearance-pdf";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ClearanceCompletionFabProps {
  studentId?: string;
  user?: {
    name?: string;
    email?: string;
    userId?: string;
  };
}

export default function ClearanceCompletionFab({
  studentId,
  user,
}: ClearanceCompletionFabProps) {
  const { summary, records, studentProfile, isLoading } = useClearanceData(studentId);
  const [isExporting, setIsExporting] = useState(false);

  // Check if all clearance departments are signed off
  const isCleared =
    Boolean(
      (summary && summary.department_count > 0 && summary.remaining_department === 0) ||
        (records && records.length > 0 && records.every((r) => r.status === "Signed"))
    );

  if (isLoading || !isCleared) {
    return null;
  }

  const handleExport = async () => {
    try {
      setIsExporting(true);
      toast.info("Preparing signed clearance document...", { duration: 1500 });

      // Slight timeout to let user see feedback and ensure smooth UI thread execution
      await new Promise((resolve) => setTimeout(resolve, 350));

      const result = exportClearancePDF({
        studentProfile,
        user,
        records,
        summary,
      });

      toast.success("Clearance certificate exported successfully!", {
        description: `Downloaded ${result.filename} with Student and School copies.`,
      });
    } catch (err) {
      console.error("Failed to export clearance PDF:", err);
      toast.error("Failed to export clearance certificate", {
        description: "An unexpected error occurred while generating the PDF.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/40 bg-[#0a101f]/95 text-amber-400 shadow-2xl shadow-amber-500/20 hover:border-amber-400 hover:bg-[#0f172a] hover:text-amber-300 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer backdrop-blur-md disabled:cursor-wait disabled:opacity-70 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        title={isExporting ? "Generating PDF..." : "Download signed clearance PDF (Student & School copies)"}
        aria-label={isExporting ? "Generating signed clearance PDF" : "Download signed clearance PDF certificate"}
        aria-busy={isExporting}
      >
        {isExporting ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <FileDown className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
