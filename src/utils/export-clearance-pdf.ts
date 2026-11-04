import { APP_TIME_ZONE } from "@/lib/date-time";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getClearanceRecordsPromise,
  getStudentProfilePromise,
  getSummaryPromise,
} from "@/modules/clearance/application/repository/dashboard-repository";

export interface ExportClearancePdfOptions {
  studentProfile?: getStudentProfilePromise | null;
  user?: {
    name?: string;
    email?: string;
    userId?: string;
  };
  records: getClearanceRecordsPromise;
  summary?: getSummaryPromise;
}

/**
 * Exports an official Certificate of Institutional Clearance formatted for printing.
 * Per institutional requirements, both the Student and the School (Registrar) require an identical copy.
 * Generates two identical clearance tables on a single portrait A4 page, each occupying half of the page,
 * separated by a perforation / dashed cut line.
 */
export function exportClearancePDF({
  studentProfile,
  user,
  records,
}: ExportClearancePdfOptions): { success: boolean; filename: string } {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const halfHeight = pageHeight / 2; // 148.5 mm

  // Sort records logically by tier and department name
  const sortedRecords = [...records].sort((a, b) => {
    const tierA = a.tier ?? 1;
    const tierB = b.tier ?? 1;
    if (tierA !== tierB) return tierA - tierB;
    return a.department.localeCompare(b.department);
  });

  const studentId = studentProfile?.student_id || user?.userId || "N/A";
  const studentName = (studentProfile?.student_name || user?.name || "Student").toUpperCase();
  const rawCourse = studentProfile?.course_name || "Undergraduate Program";
  const yearSec =
    studentProfile?.year && studentProfile?.section_number
      ? `${studentProfile.year}-${studentProfile.section_number}`
      : studentProfile?.section_number
      ? `Sec ${studentProfile.section_number}`
      : "Regular";
  const courseSection = `${rawCourse} ${yearSec}`.trim();

  const ayYear = studentProfile?.year
    ? `A.Y. ${studentProfile.year}-${studentProfile.year + 1}`
    : `A.Y. ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  const termStr = studentProfile?.semester
    ? `Semester ${studentProfile.semester}`
    : "First Semester";
  const academicTerm = `${termStr} · ${ayYear}`;

  const issueDate = new Date().toLocaleDateString("en-US", { timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Prepare table rows for autoTable
  const tableData = sortedRecords.map((rec, index) => {
    const isSigned = rec.status === "Signed";
    const signedDate = rec.signed_at
      ? new Date(rec.signed_at).toLocaleDateString("en-US", { timeZone: APP_TIME_ZONE,
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : isSigned
      ? issueDate
      : "Pending";

    return [
      String(index + 1),
      rec.department.toUpperCase(),
      `Phase ${rec.tier ?? 1}`,
      rec.staff ? rec.staff.toUpperCase() : "AUTHORIZED DESK",
      isSigned ? "SIGNED" : rec.status.toUpperCase(),
      signedDate,
      isSigned ? "CLEARED / NO ACCOUNTABILITY" : "PENDING REVIEW",
    ];
  });

  /**
   * Helper to render one half of the page (occupies startY to startY + 140mm)
   */
  const renderHalf = (startY: number, copyLabel: "STUDENT'S COPY" | "SCHOOL'S COPY") => {
    const marginX = 14;
    const contentWidth = pageWidth - marginX * 2; // 182 mm

    // ── 1. Top Bar & Copy Pill ──
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(pageWidth - marginX - 32, startY + 4, 32, 5.5, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    const copyWidth = doc.getTextWidth(copyLabel);
    doc.text(copyLabel, pageWidth - marginX - 16 - copyWidth / 2, startY + 7.8);

    // ── 2. Institution Centered Header ──
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    const instName = "STI COLLEGE";
    doc.text(instName, (pageWidth - doc.getTextWidth(instName)) / 2, startY + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139); // slate-500
    const officeName = "OFFICE OF THE REGISTRAR & STUDENT SERVICES";
    doc.text(officeName, (pageWidth - doc.getTextWidth(officeName)) / 2, startY + 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const docTitle = "CERTIFICATE OF INSTITUTIONAL CLEARANCE";
    doc.text(docTitle, (pageWidth - doc.getTextWidth(docTitle)) / 2, startY + 16.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(academicTerm, (pageWidth - doc.getTextWidth(academicTerm)) / 2, startY + 20);

    // ── 3. Student Information Card ──
    const cardY = startY + 22.5;
    const cardHeight = 11.5;

    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.2);
    doc.roundedRect(marginX, cardY, contentWidth, cardHeight, 1.2, 1.2, "FD");

    const colW = contentWidth / 4;

    // Col 1: Student Number
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(100, 116, 139);
    doc.text("STUDENT IDENTIFICATION NO.", marginX + 3, cardY + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(studentId, marginX + 3, cardY + 8.5);

    // Col 2: Student Name
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(100, 116, 139);
    doc.text("STUDENT FULL NAME", marginX + colW + 2, cardY + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    const truncatedName =
      doc.getTextWidth(studentName) > colW - 4 ? studentName.slice(0, 22) + "..." : studentName;
    doc.text(truncatedName, marginX + colW + 2, cardY + 8.5);

    // Col 3: Program & Section
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(100, 116, 139);
    doc.text("ACADEMIC PROGRAM & SECTION", marginX + colW * 2 + 2, cardY + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    const truncatedCourse =
      doc.getTextWidth(courseSection) > colW - 4 ? courseSection.slice(0, 22) + "..." : courseSection;
    doc.text(truncatedCourse, marginX + colW * 2 + 2, cardY + 8.5);

    // Col 4: Clearance Status
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5);
    doc.setTextColor(100, 116, 139);
    doc.text("CLEARANCE STATUS", marginX + colW * 3 + 2, cardY + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(16, 149, 93); // emerald-600
    doc.text("OFFICIALLY CLEARED", marginX + colW * 3 + 2, cardY + 8.5);

    // ── 4. Department Sign-Off Table ──
    const tableStartY = cardY + cardHeight + 2;

    autoTable(doc, {
      startY: tableStartY,
      head: [
        [
          "#",
          "CLEARANCE DEPARTMENT",
          "TIER",
          "AUTHORIZED SIGNATORY",
          "STATUS",
          "DATE SIGNED",
          "VERIFICATION REMARKS",
        ],
      ],
      body: tableData,
      theme: "grid",
      margin: { left: marginX, right: marginX },
      tableWidth: contentWidth,
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontSize: 6,
        fontStyle: "bold",
        halign: "center",
        cellPadding: 1.2,
        lineWidth: 0.15,
        lineColor: [203, 213, 225],
      },
      styles: {
        fontSize: 6,
        cellPadding: 1.2,
        lineWidth: 0.1,
        lineColor: [226, 232, 240],
        textColor: [30, 41, 59],
        valign: "middle",
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 7, halign: "center" },
        1: { cellWidth: 44, halign: "left", fontStyle: "bold" },
        2: { cellWidth: 16, halign: "center" },
        3: { cellWidth: 38, halign: "left" },
        4: {
          cellWidth: 20,
          halign: "center",
          fontStyle: "bold",
          textColor: [16, 149, 93],
        },
        5: { cellWidth: 23, halign: "center" },
        6: { cellWidth: 34, halign: "center", fontSize: 5.5, textColor: [71, 85, 105] },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 2.5;

    // ── 5. Certification Note & Signature Blocks ──
    doc.setFont("helvetica", "italic");
    doc.setFontSize(5.2);
    doc.setTextColor(100, 116, 139);
    const certNote =
      "This certifies that the bearer has completed all clearance requirements and has no outstanding property or financial liabilities.";
    doc.text(certNote, (pageWidth - doc.getTextWidth(certNote)) / 2, finalY);

    const sigLineY = finalY + 7.5;
    const sigW = 54;

    // Left Signature: Student
    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(0.2);
    doc.line(marginX + 10, sigLineY, marginX + 10 + sigW, sigLineY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(15, 23, 42);
    const sSigText = "Student's Signature over Printed Name";
    doc.text(sSigText, marginX + 10 + (sigW - doc.getTextWidth(sSigText)) / 2, sigLineY + 2.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.8);
    doc.setTextColor(100, 116, 139);
    const sDateText = `Date Confirmed: ${issueDate}`;
    doc.text(sDateText, marginX + 10 + (sigW - doc.getTextWidth(sDateText)) / 2, sigLineY + 5.5);

    // Right Signature: Registrar
    const regX = pageWidth - marginX - 10 - sigW;
    doc.line(regX, sigLineY, regX + sigW, sigLineY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(15, 23, 42);
    const rSigText = "Registrar / Clearance Officer";
    doc.text(rSigText, regX + (sigW - doc.getTextWidth(rSigText)) / 2, sigLineY + 2.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.8);
    doc.setTextColor(100, 116, 139);
    const rSealText = "Official Institutional Seal / Validation";
    doc.text(rSealText, regX + (sigW - doc.getTextWidth(rSealText)) / 2, sigLineY + 5.5);
  };

  // ── Render Top Half: STUDENT'S COPY ──
  renderHalf(4, "STUDENT'S COPY");

  // ── Center Dividing / Perforation Line ──
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(10, halfHeight, pageWidth - 10, halfHeight);

  // Perforation Notice Badge centered on line
  doc.setLineDashPattern([], 0); // reset to solid
  doc.setFillColor(255, 255, 255);
  const cutNote = "✂  CUT ALONG DASHED LINE  ✂";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(140, 140, 140);
  const cutNoteW = doc.getTextWidth(cutNote) + 6;
  doc.rect((pageWidth - cutNoteW) / 2, halfHeight - 2, cutNoteW, 4, "F");
  doc.text(cutNote, (pageWidth - doc.getTextWidth(cutNote)) / 2, halfHeight + 0.8);

  // ── Render Bottom Half: SCHOOL'S COPY ──
  renderHalf(halfHeight + 2, "SCHOOL'S COPY");

  const filename = `STI_Clearance_Certificate_${studentId}.pdf`;
  doc.save(filename);

  return { success: true, filename };
}
