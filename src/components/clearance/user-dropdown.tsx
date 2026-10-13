"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, FileDown, ShieldCheck } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getClearanceRecordsPromise, getStudentProfilePromise, getSummaryPromise } from "@/modules/clearance/application/repository/dashboard-repository";

interface UserDropdownProps {
  user: {
    name: string;
    email: string;
  };
  profile: getStudentProfilePromise | null;
  records: getClearanceRecordsPromise;
  summary: getSummaryPromise;
}

export default function UserDropdown({ user, profile, records, summary }: UserDropdownProps) {
  const isCleared = summary.remaining_department === 0 && summary.department_count > 0;

  const handleLogout = () => {
    window.location.replace("/api/auth/clear-session");
  };

  const generatePDF = () => {
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
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-9 w-9 items-center justify-center rounded-full border bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer outline-none">
          <User size={20} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-1">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={generatePDF} 
          disabled={!isCleared}
          className="cursor-pointer flex items-center gap-2"
        >
          <FileDown size={16} />
          <span>Export Clearance (PDF)</span>
          {!isCleared && (
            <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
              Pending
            </span>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleLogout}
          className="cursor-pointer flex items-center gap-2 text-red-600 focus:text-red-600"
        >
          <LogOut size={16} />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
