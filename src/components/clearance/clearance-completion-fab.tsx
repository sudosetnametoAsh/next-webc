"use client";

import React, { useState } from "react";
import { useClearanceData } from "@/hooks/clearance/use-clearance-data";
import { exportClearancePDF } from "@/utils/export-clearance-pdf";
import { FileDown, CheckCircle2, Loader2, Sparkles } from "lucide-react";
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
      <div className="relative group">
        {/* Ambient pulse glow */}
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-40 blur-md group-hover:opacity-75 transition duration-500 group-hover:duration-200 animate-pulse" />

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="relative flex items-center gap-3.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 bg-[length:200%_auto] hover:bg-[position:right_center] transition-all duration-300 px-5 py-3 text-white shadow-2xl shadow-emerald-950/60 border border-emerald-400/40 hover:scale-[1.03] active:scale-[0.98] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          title="Download signed clearance PDF (Student & School copies)"
          aria-label="Download signed clearance PDF certificate"
        >
          {/* Status Icon */}
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white shadow-inner">
            {isExporting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FileDown className="h-5 w-5 transition-transform group-hover:translate-y-0.5" />
            )}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
          </div>

          {/* Text Labels */}
          <div className="flex flex-col text-left pr-1">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-100">
              <CheckCircle2 className="h-3 w-3 text-emerald-200 shrink-0" />
              Clearance Completed
            </span>
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              {isExporting ? "Generating PDF..." : "Export Signed Copy"}
              <Sparkles className="h-3 w-3 text-emerald-200 shrink-0" />
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
