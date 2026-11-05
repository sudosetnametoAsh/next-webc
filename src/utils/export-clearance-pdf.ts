import { APP_TIME_ZONE } from "@/lib/date-time";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  getClearanceRecordsPromise,
  getStudentProfilePromise,
  getSummaryPromise,
} from "@/modules/clearance/application/repository/dashboard-repository";

export interface ExportClearancePdfOptions {
  studentProfile?: getStudentProfilePromise | null;
  user?: { name?: string; email?: string; userId?: string };
  records: getClearanceRecordsPromise;
  summary?: getSummaryPromise;
}

/** Print matching student and school copies, with continuation sheets for long lists. */
export function exportClearancePDF({ studentProfile, user, records }: ExportClearancePdfOptions): {
  success: boolean;
  filename: string;
} {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const halfHeight = doc.internal.pageSize.getHeight() / 2;
  const margin = 12;
  const contentWidth = width - margin * 2;
  const studentId = studentProfile?.student_id || user?.userId || "";
  const studentName = (studentProfile?.student_name || user?.name || "").toUpperCase();
  const program = studentProfile?.course_name || "";
  const term = studentProfile?.semester != null ? String(studentProfile.semester) : "";
  const sortedRecords = [...records].sort((a, b) =>
    (a.tier ?? 1) - (b.tier ?? 1) || a.department.localeCompare(b.department)
  );

  const lastPhase = Math.max(1, ...sortedRecords.map(record => record.tier ?? 1));
  const receivers = sortedRecords.filter(record => (record.tier ?? 1) === lastPhase);
  const tableRecords = sortedRecords.filter(record => (record.tier ?? 1) !== lastPhase);
  const receiverRows = Math.max(1, Math.ceil(Math.min(receivers.length, 4) / 2));
  const receiverHeight = receiverRows * 23 + 4;
  const tableBottom = 137 - receiverHeight;
  const departmentWidth = contentWidth * 0.45;
  const signatoryWidth = contentWidth - departmentWidth;

  const signedDate = (record: getClearanceRecordsPromise[number]) => {
    if (record.status !== "Signed" || !record.signed_at) return null;
    const date = new Date(record.signed_at);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TIME_ZONE, month: "short", day: "2-digit", year: "numeric",
    }).formatToParts(date);
    const part = (type: string) => parts.find(value => value.type === type)?.value || "";
    return `${part("month").toUpperCase()} ${part("day")} ${part("year")}`;
  };
  const lastSigningOfficer = receivers
    .filter(record => signedDate(record) !== null)
    .sort((a, b) => new Date(b.signed_at!).getTime() - new Date(a.signed_at!).getTime())[0];

  // Draw the stamp as sharp PDF text and lines, with no bitmap background.
  const stamp = (record: getClearanceRecordsPromise[number], x: number, y: number) => {
    const date = signedDate(record);
    if (!date) return;
    doc.setTextColor(25, 32, 35);
    doc.setDrawColor(25, 32, 35);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("SIGNED ON", x + 14.5, y + 2.8, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(date, x + 14.5, y + 5.5, { align: "center" });
    doc.setTextColor(0);
  };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const rows = tableRecords.map(record => ({
    record,
    department: doc.splitTextToSize(record.department.toUpperCase(), departmentWidth - 5) as string[],
    name: [(record.staff || "").toUpperCase()],
  }));
  const sheets: typeof rows[] = [];
  let sheet: typeof rows = [];
  let usedHeight = 0;
  for (const row of rows) {
    const rowHeight = Math.max(row.department.length, 1) * (8 * 1.15 * 25.4 / 72) + 4;
    if (sheet.length > 0 && usedHeight + rowHeight > tableBottom - 68) {
      sheets.push(sheet);
      sheet = [];
      usedHeight = 0;
    }
    sheet.push(row);
    usedHeight += rowHeight;
  }
  if (sheet.length > 0 || sheets.length === 0) sheets.push(sheet);
  const receiverSheets = Math.max(1, Math.ceil(receivers.length / 4));
  while (sheets.length < receiverSheets) sheets.push([]);

  const renderCopy = (top: number, label: string, body: typeof rows, sheetIndex: number) => {
    doc.setTextColor(0);
    doc.setDrawColor(60);
    doc.setLineWidth(0.2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("STI COLLEGE LUCENA", margin, top + 7);
    doc.setFontSize(8);
    doc.text(label, width - margin, top + 7, { align: "right" });
    doc.setFontSize(12);
    doc.text("CLEARANCE FORM", width / 2, top + 15, { align: "center" });
    if (sheets.length > 1) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text(`Sheet ${sheetIndex + 1} of ${sheets.length}`, width - margin, top + 15, { align: "right" });
    }

    const field = (label: string, value: string, x: number, y: number, fieldWidth: number) => {
      doc.rect(x, y, fieldWidth, 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text(label, x + 2, y + 3.5);
      doc.setFont("helvetica", "bold");
      // Fit long names without discarding any part of the student's name.
      let fontSize = 9;
      doc.setFontSize(fontSize);
      while (doc.getTextWidth(value) > fieldWidth - 4 && fontSize > 5) {
        fontSize -= 0.25;
        doc.setFontSize(fontSize);
      }
      doc.text(value, x + 2, y + 9);
    };
    const leftWidth = contentWidth * 0.65;
    const rightX = margin + leftWidth;
    const rightWidth = contentWidth - leftWidth;
    field("STUDENT ID", studentId, margin, top + 20, leftWidth);
    field("ACADEMIC YEAR", "", rightX, top + 20, rightWidth);
    field("STUDENT FULL NAME", studentName, margin, top + 32, leftWidth);
    field("TERM", term, rightX, top + 32, rightWidth);
    field("COURSE / PROGRAM", program, margin, top + 44, contentWidth * 0.4);
    field("STUDENT SIGNATURE", "", margin + contentWidth * 0.4, top + 44, contentWidth * 0.3);
    field("DATE SIGNED", "", margin + contentWidth * 0.7, top + 44, contentWidth * 0.3);
    if (lastSigningOfficer) {
      stamp(lastSigningOfficer, margin + contentWidth * 0.7 + (contentWidth * 0.3 - 29) / 2, top + 49);
    }

    autoTable(doc, {
      startY: top + 60,
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
      theme: "grid",
      head: [["DEPARTMENT", "CLEARED BY (NAME/DESIGNATION) DATE"]],
      body: body.map(row => [row.department, row.name]),
      styles: {
        font: "helvetica", fontSize: 8, cellPadding: 2,
        textColor: 0, lineColor: 80, lineWidth: 0.15, valign: "middle",
      },
      headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: departmentWidth }, 1: { cellWidth: signatoryWidth } },
      didParseCell: data => {
        if (data.section === "body" && data.column.index === 1) {
          data.cell.styles.cellPadding = { top: 2, bottom: 2, left: 2, right: 35 };
          // Fit the name beside the stamp without making the row taller.
          const name = body[data.row.index].name[0];
          doc.setFont("helvetica", "normal");
          let fontSize = 8;
          doc.setFontSize(fontSize);
          while (doc.getTextWidth(name) > signatoryWidth - 37 && fontSize > 5) {
            fontSize -= 0.25;
            doc.setFontSize(fontSize);
          }
          data.cell.styles.fontSize = fontSize;
        }
      },
      didDrawCell: data => {
        if (data.section === "body" && data.column.index === 1) {
          stamp(body[data.row.index].record, data.cell.x + data.cell.width - 31, data.cell.y + (data.cell.height - 6.5) / 2);
        }
      },
      rowPageBreak: "avoid",
    });

    const receivedY = top + tableBottom + 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("RECEIVED BY:", margin, receivedY + 12);
    const receiverX = margin + 29;
    const receiverWidth = contentWidth - 29;
    const pageReceivers = receivers.slice((sheetIndex % receiverSheets) * 4, (sheetIndex % receiverSheets + 1) * 4);
    const columns = pageReceivers.length > 1 ? 2 : 1;
    const cellWidth = receiverWidth / columns;
    if (pageReceivers.length === 0) doc.line(receiverX, receivedY + 14, width - margin, receivedY + 14);
    pageReceivers.forEach((record, index) => {
      const x = receiverX + (index % columns) * cellWidth;
      const y = receivedY + Math.floor(index / columns) * 23;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      const name = (record.staff || "").toUpperCase();
      while (doc.getTextWidth(name) > cellWidth - 4 && doc.getFontSize() > 5) doc.setFontSize(doc.getFontSize() - 0.25);
      doc.text(name, x + cellWidth / 2, y + 12, { align: "center" });
      doc.setDrawColor(60);
      doc.line(x + 2, y + 13, x + cellWidth - 2, y + 13);
      stamp(record, x + (cellWidth - 29) / 2, y + 14);
    });
  };

  sheets.forEach((body, index) => {
    if (index > 0) doc.addPage();
    renderCopy(3, "STUDENT'S COPY", body, index);
    doc.setDrawColor(140);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(margin, halfHeight, width - margin, halfHeight);
    doc.setLineDashPattern([], 0);
    renderCopy(halfHeight + 2, "SCHOOL'S COPY", body, index);
  });

  const filename = `STI_Clearance_Certificate_${studentId || "Student"}.pdf`;
  doc.save(filename);
  return { success: true, filename };
}
