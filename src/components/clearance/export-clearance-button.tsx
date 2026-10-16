"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import type { getClearanceRecordsPromise, getStudentProfilePromise, getSummaryPromise } from "@/modules/clearance/application/repository/dashboard-repository";

interface ExportClearanceButtonProps {
  user: {
    name: string;
    email: string;
  };
  profile: getStudentProfilePromise | null;
  records: getClearanceRecordsPromise;
  summary: getSummaryPromise;
}

export default function ExportClearanceButton({ user, profile, records, summary }: ExportClearanceButtonProps) {
  const isCleared = summary.remaining_department === 0 && summary.department_count > 0;
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const generatePDF = async () => {
    if (!isCleared || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Helper for centering text
      const centerText = (text: string, y: number, fontSize = 12, fontStyle = "normal") => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", fontStyle);
        const textWidth = doc.getTextWidth(text);
        doc.text(text, (pageWidth - textWidth) / 2, y);
      };

      // --- Header ---
      centerText("STI COLLEGE LUCENA", 20, 14, "bold");
      centerText("CLEARANCE FORM", 28, 16, "bold");

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("SCHOOL'S COPY", pageWidth - 45, 28);

      // --- Student Info Section ---
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.rect(15, 35, pageWidth - 30, 40); // Main info box

      doc.setFontSize(9);
      doc.text("STUDENT IDENTIFICATION NUMBER:", 20, 45);
      doc.setFont("helvetica", "bold");
      doc.text(profile?.student_id || "N/A", 80, 45);

      doc.setFont("helvetica", "normal");
      doc.text("LAST NAME, FIRST NAME, MIDDLE INITIAL:", 20, 52);
      doc.setFont("helvetica", "bold");
      doc.text(profile?.student_name || user.name, 90, 52);

      doc.setFont("helvetica", "normal");
      doc.text("COURSE/SECTION:", 20, 59);
      doc.setFont("helvetica", "bold");
      doc.text(`${profile?.course_name || "N/A"} ${profile?.section_number || ""}`, 60, 59);

      // Academic Year & Term
      doc.setFont("helvetica", "normal");
      doc.text("ACADEMIC YEAR:", 120, 45);
      doc.setFont("helvetica", "bold");
      const ay = profile?.year ? `${profile.year}-${profile.year + 1}` : "N/A";
      doc.text(ay, 155, 45);

      doc.setFont("helvetica", "normal");
      doc.text("TERM:", 120, 52);
      doc.setFont("helvetica", "bold");
      doc.text(profile?.semester?.toString() || "N/A", 155, 52);

      doc.setFont("helvetica", "normal");
      doc.text("STUDENT TYPE:", 120, 59);
      doc.setFont("helvetica", "bold");
      doc.text("REGULAR", 155, 59); // Defaulting to Regular as per common case

      // --- Departments Table ---
      const tableData = records.map((record) => [
        record.department,
        record.status === "Signed" ? "/" : "", // No Accountabilities
        record.status !== "Signed" ? "/" : "", // With Accountabilities
        record.status === "Signed" ? record.staff : "", // Signature (name)
        record.status === "Signed" ? new Date().toLocaleDateString() : "", // Date
      ]);

      autoTable(doc, {
        startY: 85,
        head: [
          ["DEPARTMENT", "NO ACCOUNTABILITIES", "WITH ACCOUNTABILITIES", "SIGNATURE", "DATE SIGNED"],
        ],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontSize: 8,
          halign: "center",
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { halign: "center", cellWidth: 35 },
          2: { halign: "center", cellWidth: 35 },
          3: { halign: "center" },
          4: { halign: "center" },
        },
      });

      // --- Footer ---
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("RECEIVED BY:", 15, finalY);

      doc.setLineWidth(0.2);
      doc.line(45, finalY, 120, finalY); // Signature line

      doc.setFont("helvetica", "bold");
      doc.text("REGISTRAR", 70, finalY + 5);

      doc.save(`STI_Clearance_${profile?.student_id || "Student"}.pdf`);
    } catch (error) {
      console.error("Failed to export clearance PDF:", error);
      setExportError("Could not export clearance. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex max-w-full flex-col items-end gap-2 text-right">
      <Button
        type="button"
        variant="outline"
        onClick={generatePDF}
        disabled={!isCleared || exporting}
        aria-busy={exporting}
        title={!isCleared ? "Available after all departments have signed your clearance." : undefined}
        className="rounded-xl"
      >
        <FileDown aria-hidden="true" />
        <span>{exporting ? "Generating PDF..." : "Export PDF"}</span>
        {!isCleared && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            Pending
          </span>
        )}
      </Button>
      {exporting && <p role="status" className="text-xs text-slate-600 dark:text-slate-400">Generating PDF...</p>}
      {exportError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{exportError}</p>}
    </div>
  );
}
