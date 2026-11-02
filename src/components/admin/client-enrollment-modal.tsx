"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UserPlus,
  FileSpreadsheet,
  GraduationCap,
  Briefcase,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Sparkles,
  ChevronDown,
  Info,
  Layers,
  Phone,
  Mail,
  User,
  FileText,
} from "lucide-react";
import { useFetchCourses } from "@/hooks/admin/courses";
import { useFetchSections, useBulkImportRoster } from "@/hooks/admin/enrollments";
import { shrinkCourseName } from "@/utils/formatters";

interface ClientEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  toastSuccess?: (message: string, title?: string) => void;
  toastError?: (message: string, title?: string) => void;
}

type TabMode = "single" | "bulk";
type ClientType = "student" | "staff";

interface ParsedBulkRow {
  rowNum: number;
  id: string;
  name: string;
  email: string;
  phone?: string;
  course?: string;
  year?: number;
  semester?: number;
  section?: number;
  isValid: boolean;
  error?: string;
}

export default function ClientEnrollmentModal({
  isOpen,
  onClose,
  toastSuccess,
  toastError,
}: ClientEnrollmentModalProps) {
  const [activeTab, setActiveTab] = useState<TabMode>("single");
  const [clientType, setClientType] = useState<ClientType>("student");

  // Single Enrollment Form State
  const [singleId, setSingleId] = useState("");
  const [singleName, setSingleName] = useState("");
  const [singleEmail, setSingleEmail] = useState("");
  const [singlePhone, setSinglePhone] = useState("");

  // Course & Section State for Student
  const [selectedCourseId, setSelectedCourseId] = useState<string>("auto");
  const [customCourseName, setCustomCourseName] = useState("");
  const [sectionMode, setSectionMode] = useState<"existing" | "new">("existing");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("auto");
  const [newYear, setNewYear] = useState<number>(1);
  const [newSemester, setNewSemester] = useState<number>(1);
  const [newSectionNumber, setNewSectionNumber] = useState<number>(1);

  // Bulk Import State
  const [bulkClientType, setBulkClientType] = useState<ClientType>("student");
  const [bulkInputMode, setBulkInputMode] = useState<"upload" | "paste">("upload");
  const [rawPastedText, setRawPastedText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedBulkRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries & Mutations
  const { data: courses = [], isLoading: isLoadingCourses } = useFetchCourses();
  const numericCourseId = selectedCourseId !== "auto" && selectedCourseId !== "custom" ? Number(selectedCourseId) : undefined;
  const { data: sections = [], isLoading: isLoadingSections } = useFetchSections(numericCourseId);
  const { mutateAsync: importRoster, isPending: isSubmitting } = useBulkImportRoster();

  // Reset form when closing or switching tabs
  const handleReset = () => {
    setSingleId("");
    setSingleName("");
    setSingleEmail("");
    setSinglePhone("");
    setSelectedCourseId("auto");
    setCustomCourseName("");
    setSectionMode("existing");
    setSelectedSectionId("auto");
    setNewYear(1);
    setNewSemester(1);
    setNewSectionNumber(1);

    setFileName(null);
    setRawPastedText("");
    setParsedRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleModalClose = () => {
    if (!isSubmitting) {
      handleReset();
      onClose();
    }
  };

  // Resolve active course name for single student
  const activeCourseName = useMemo(() => {
    if (selectedCourseId === "custom") {
      return customCourseName.trim();
    }
    if (selectedCourseId !== "auto") {
      const found = courses.find((c) => c.course_id === Number(selectedCourseId));
      return found?.course_name || "";
    }
    return courses[0]?.course_name || "";
  }, [selectedCourseId, customCourseName, courses]);

  // Validation for Single Enrollment
  const isSingleValid = useMemo(() => {
    if (!singleId.trim() || singleId.trim().length > 11 || !singleName.trim() || !singleEmail.trim()) {
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(singleEmail.trim())) {
      return false;
    }
    if (clientType === "student") {
      if (selectedCourseId === "custom" && !customCourseName.trim()) {
        return false;
      }
    }
    return true;
  }, [singleId, singleName, singleEmail, clientType, selectedCourseId, customCourseName]);

  // Single Submission Handler
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSingleValid) return;

    try {
      if (clientType === "student") {
        const payload = {
          type: "student" as const,
          clients: [
            {
              student_id: singleId.trim(),
              name: singleName.trim(),
              email: singleEmail.trim(),
              phoneNumber: singlePhone.trim() || undefined,
              course_name: activeCourseName,
              section_id:
                sectionMode === "existing" && selectedSectionId !== "auto"
                  ? Number(selectedSectionId)
                  : undefined,
              year: sectionMode === "new" ? newYear : undefined,
              semester: sectionMode === "new" ? newSemester : undefined,
              section_number: sectionMode === "new" ? newSectionNumber : undefined,
            },
          ],
        };

        const res = await importRoster(payload);
        if (res.summary?.failedCount > 0 && res.summary.errors?.[0]) {
          toastError?.(res.summary.errors[0].error, "Enrollment Failed");
          return;
        }

        toastSuccess?.(
          `Student "${singleName.trim()}" (${singleId.trim()}) enrolled successfully! Clearance records generated.`,
          "Enrollment Successful"
        );
      } else {
        const payload = {
          type: "staff" as const,
          clients: [
            {
              staff_id: singleId.trim(),
              name: singleName.trim(),
              email: singleEmail.trim(),
            },
          ],
        };

        const res = await importRoster(payload);
        if (res.summary?.failedCount > 0 && res.summary.errors?.[0]) {
          toastError?.(res.summary.errors[0].error, "Staff Creation Failed");
          return;
        }

        toastSuccess?.(
          `Staff member "${singleName.trim()}" (${singleId.trim()}) registered successfully! Staff clearance generated.`,
          "Staff Enrolled"
        );
      }

      handleModalClose();
    } catch (err: any) {
      toastError?.(err.message || "An unexpected error occurred during enrollment.", "Enrollment Error");
    }
  };

  // CSV Template Generator & Downloader
  const downloadCsvTemplate = (type: ClientType) => {
    let csvContent = "";
    let filename = "";

    if (type === "student") {
      filename = "student_enrollment_template.csv";
      csvContent =
        "student_id,name,email,course_name,year,semester,section_number,phone_number\n" +
        "02000301199,Jyrum Jaro,jyrum.301199@urdaneta.sti.edu.ph,Bachelor of Science and Computer Science,4,1,1,09123456789\n" +
        "02000301200,Maria Santos,maria.301200@urdaneta.sti.edu.ph,BSIT,3,1,2,09187654321\n";
    } else {
      filename = "staff_enrollment_template.csv";
      csvContent =
        "staff_id,name,email\n" +
        "EMP-2024-001,Dr. Alan Turing,alan.turing@urdaneta.sti.edu.ph\n" +
        "EMP-2024-002,Prof. Ada Lovelace,ada.lovelace@urdaneta.sti.edu.ph\n";
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // CSV / Text Parser
  const parseRawText = (text: string, type: ClientType) => {
    setIsParsing(true);
    try {
      const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
      if (!cleanText) {
        setParsedRows([]);
        return;
      }

      const lines = cleanText.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        setParsedRows([]);
        return;
      }

      // Check for JSON array format
      if (cleanText.startsWith("[") && cleanText.endsWith("]")) {
        try {
          const parsedJson = JSON.parse(cleanText);
          if (Array.isArray(parsedJson)) {
            const rows: ParsedBulkRow[] = parsedJson.map((item, index) => {
              const id = (item.student_id || item.staff_id || item.id || "").toString().trim();
              const name = (item.name || item.student_name || item.staff_name || "").toString().trim();
              const email = (item.email || "").toString().trim();
              const phone = (item.phone || item.phone_number || item.phoneNumber || "").toString().trim();
              const course = (item.course_name || item.course || item.program || "").toString().trim();
              const year = item.year ? Number(item.year) : 1;
              const semester = item.semester ? Number(item.semester) : 1;
              const section = item.section_number || item.section ? Number(item.section_number || item.section) : 1;

              const isValid = Boolean(id && id.length <= 11 && email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
              let error = "";
              if (!id) error = "Missing ID";
              else if (id.length > 11) error = "ID exceeds 11 chars";
              else if (!email) error = "Missing Email";
              else if (!isValid) error = "Invalid Email";

              return {
                rowNum: index + 1,
                id,
                name: name || id,
                email,
                phone,
                course,
                year,
                semester,
                section,
                isValid,
                error,
              };
            });
            setParsedRows(rows);
            return;
          }
        } catch {
          // Fall back to CSV parsing
        }
      }

      // CSV parsing
      const firstLine = lines[0].toLowerCase();
      const delimiter = firstLine.includes("\t") ? "\t" : ",";

      // Detect header row
      const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
      const hasHeader =
        headers.some((h) => h.includes("id")) ||
        headers.some((h) => h.includes("email")) ||
        headers.some((h) => h.includes("name"));

      const dataLines = hasHeader ? lines.slice(1) : lines;

      // Map header column indices if available
      let idIdx = headers.findIndex((h) => h.includes("id"));
      let nameIdx = headers.findIndex((h) => h.includes("name"));
      let emailIdx = headers.findIndex((h) => h.includes("email"));
      let courseIdx = headers.findIndex((h) => h.includes("course") || h.includes("program"));
      let yearIdx = headers.findIndex((h) => h.includes("year"));
      let semIdx = headers.findIndex((h) => h.includes("sem"));
      let secIdx = headers.findIndex((h) => h.includes("sec"));
      let phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("contact"));

      // Default positional indices if header not detected
      if (!hasHeader) {
        idIdx = 0;
        nameIdx = 1;
        emailIdx = 2;
        if (type === "student") {
          courseIdx = 3;
          yearIdx = 4;
          semIdx = 5;
          secIdx = 6;
          phoneIdx = 7;
        }
      }

      const rows: ParsedBulkRow[] = dataLines.map((line, idx) => {
        // Handle basic CSV quotes
        const cols: string[] = [];
        let cur = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            cols.push(cur.trim().replace(/^["']|["']$/g, ""));
            cur = "";
          } else {
            cur += char;
          }
        }
        cols.push(cur.trim().replace(/^["']|["']$/g, ""));

        const id = (cols[idIdx] || "").trim();
        const name = (cols[nameIdx] || "").trim();
        const email = (cols[emailIdx] || "").trim();
        const course = courseIdx !== -1 && cols[courseIdx] ? cols[courseIdx].trim() : "";
        const year = yearIdx !== -1 && !isNaN(Number(cols[yearIdx])) ? Number(cols[yearIdx]) : 1;
        const semester = semIdx !== -1 && !isNaN(Number(cols[semIdx])) ? Number(cols[semIdx]) : 1;
        const section = secIdx !== -1 && !isNaN(Number(cols[secIdx])) ? Number(cols[secIdx]) : 1;
        const phone = phoneIdx !== -1 && cols[phoneIdx] ? cols[phoneIdx].trim() : undefined;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = Boolean(id && id.length <= 11 && email && emailRegex.test(email));
        let error = "";
        if (!id) error = "Missing ID";
        else if (id.length > 11) error = "ID exceeds 11 chars";
        else if (!email) error = "Missing Email";
        else if (!emailRegex.test(email)) error = "Invalid Email";

        return {
          rowNum: idx + 1,
          id,
          name: name || id,
          email,
          phone,
          course: course || (type === "student" ? "General Course" : undefined),
          year,
          semester,
          section,
          isValid,
          error,
        };
      });

      setParsedRows(rows);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        parseRawText(content, bulkClientType);
      }
    };
    reader.readAsText(file);
  };

  const handlePastedTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawPastedText(val);
    parseRawText(val, bulkClientType);
  };

  // Bulk Submit Handler
  const validBulkRows = useMemo(() => parsedRows.filter((r) => r.isValid), [parsedRows]);
  const invalidBulkRows = useMemo(() => parsedRows.filter((r) => !r.isValid), [parsedRows]);

  const handleBulkSubmit = async () => {
    if (validBulkRows.length === 0) return;

    try {
      const payload = {
        type: bulkClientType,
        clients: validBulkRows.map((r) => ({
          student_id: bulkClientType === "student" ? r.id : undefined,
          staff_id: bulkClientType === "staff" ? r.id : undefined,
          name: r.name,
          email: r.email,
          phoneNumber: r.phone,
          course_name: r.course,
          year: r.year,
          semester: r.semester,
          section_number: r.section,
        })),
      };

      const res = await importRoster(payload);

      if (res.summary?.failedCount > 0 && res.summary.errors?.length > 0) {
        toastError?.(
          `Import partially completed. ${res.summary.successCount} succeeded, ${res.summary.failedCount} failed.`,
          "Import Warning"
        );
      } else {
        toastSuccess?.(
          `Successfully enrolled all ${res.summary?.successCount || validBulkRows.length} ${
            bulkClientType === "student" ? "students" : "staff members"
          }! Clearance records generated.`,
          "Bulk Import Successful"
        );
      }

      handleModalClose();
    } catch (err: any) {
      toastError?.(err.message || "Failed to process bulk import roster.", "Import Error");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-2xl bg-[#0a101f] border border-slate-800 text-white p-0 overflow-hidden shadow-2xl rounded-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800/80 bg-slate-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Client Enrollment
                  <span className="text-xs font-normal text-amber-400/90 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    Registrar Hub
                  </span>
                </DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Register new students or staff to automatically generate institutional clearance pipelines.
                </p>
              </div>
            </div>
            <button
              onClick={handleModalClose}
              disabled={isSubmitting}
              className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 mt-5 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveTab("single")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "single"
                  ? "bg-amber-500 text-slate-950 shadow-md font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Single Client Enrollment
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bulk")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "bulk"
                  ? "bg-amber-500 text-slate-950 shadow-md font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Bulk Roster Import (CSV/JSON)
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="overflow-y-auto px-6 py-5 flex-1 space-y-5 custom-scrollbar">
          {activeTab === "single" ? (
            /* ========================================================================= */
            /* SINGLE ENROLLMENT TAB                                                     */
            /* ========================================================================= */
            <form onSubmit={handleSingleSubmit} className="space-y-5">
              {/* Client Type Segmented Switch */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Client Role / Classification
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setClientType("student")}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      clientType === "student"
                        ? "bg-amber-500/10 border-amber-500/50 text-white shadow-xs"
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        clientType === "student"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Student</div>
                      <div className="text-[11px] text-slate-400">Undergraduate & Senior High</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setClientType("staff")}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      clientType === "staff"
                        ? "bg-amber-500/10 border-amber-500/50 text-white shadow-xs"
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        clientType === "staff"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Staff Member</div>
                      <div className="text-[11px] text-slate-400">Faculty & Non-Teaching Staff</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Core Information Section */}
              <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-800/80 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-amber-400" />
                  Identification & Account
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ID Field */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>
                        {clientType === "student" ? "Student ID Number" : "Employee / Staff ID"}{" "}
                        <span className="text-amber-400">*</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">Max 11 chars</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      value={singleId}
                      onChange={(e) => setSingleId(e.target.value)}
                      placeholder={clientType === "student" ? "e.g. 02000301199" : "e.g. EMP-2024-01"}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors font-mono"
                    />
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Full Name <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                      placeholder="e.g. Jyrum Jaro or Santos, Maria"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Institutional Email */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-slate-400" />
                      STI Email Address <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={singleEmail}
                      onChange={(e) => setSingleEmail(e.target.value)}
                      placeholder="username@urdaneta.sti.edu.ph"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                    />
                  </div>

                  {/* Phone Number (Student only) */}
                  {clientType === "student" ? (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-slate-400" />
                        Contact Number <span className="text-slate-500 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={singlePhone}
                        onChange={(e) => setSinglePhone(e.target.value)}
                        placeholder="e.g. +63 912 345 6789"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center text-xs text-slate-400 italic pt-6">
                      Staff accounts link directly to campus-wide departments.
                    </div>
                  )}
                </div>
              </div>

              {/* Academic Placement (Student Only) */}
              {clientType === "student" && (
                <div className="bg-slate-900/40 rounded-xl p-4 border border-slate-800/80 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <GraduationCap className="h-3.5 w-3.5 text-amber-400" />
                      Academic Program & Section Placement
                    </span>
                    <span className="text-[11px] font-normal text-slate-400">
                      Determines clearance template checklist
                    </span>
                  </div>

                  {/* Program Dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Degree Program / Course <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedCourseId}
                        onChange={(e) => {
                          setSelectedCourseId(e.target.value);
                          setSelectedSectionId("auto");
                        }}
                        className="w-full appearance-none px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors pr-8"
                      >
                        <option value="auto">
                          -- Select Academic Program --
                        </option>
                        {courses.map((c) => (
                          <option key={c.course_id} value={String(c.course_id)}>
                            {c.course_name} ({shrinkCourseName(c.course_name)})
                          </option>
                        ))}
                        <option value="custom">+ Create / Specify New Program...</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Custom Program Input if selected */}
                  {selectedCourseId === "custom" && (
                    <div>
                      <label className="block text-xs font-medium text-amber-300 mb-1.5">
                        New Program Name <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={customCourseName}
                        onChange={(e) => setCustomCourseName(e.target.value)}
                        placeholder="e.g. Bachelor of Science in Information Technology"
                        className="w-full px-3 py-2 bg-slate-950 border border-amber-500/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
                      />
                    </div>
                  )}

                  {/* Section Assignment Toggle */}
                  <div className="pt-2 border-t border-slate-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-300">
                        Section Assignment
                      </label>
                      <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSectionMode("existing")}
                          className={`px-2.5 py-1 rounded-md transition-all ${
                            sectionMode === "existing"
                              ? "bg-slate-800 text-white font-semibold"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Existing Section
                        </button>
                        <button
                          type="button"
                          onClick={() => setSectionMode("new")}
                          className={`px-2.5 py-1 rounded-md transition-all ${
                            sectionMode === "new"
                              ? "bg-slate-800 text-white font-semibold"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          New Cohort / Section
                        </button>
                      </div>
                    </div>

                    {sectionMode === "existing" ? (
                      <div>
                        <div className="relative">
                          <select
                            value={selectedSectionId}
                            onChange={(e) => setSelectedSectionId(e.target.value)}
                            className="w-full appearance-none px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-colors pr-8"
                          >
                            <option value="auto">
                              -- Auto-assign or Default Section --
                            </option>
                            {sections.map((sec) => (
                              <option key={sec.section_id} value={String(sec.section_id)}>
                                {sec.section_code} ({sec.enrolled_count} students)
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        </div>
                        {sections.length === 0 && selectedCourseId !== "auto" && (
                          <p className="text-[11px] text-amber-400/80 mt-1.5 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            No sections exist yet for this program. A default Year 1 Section 1 will be created.
                          </p>
                        )}
                      </div>
                    ) : (
                      /* Create New Section Fields */
                      <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Year Level</label>
                          <select
                            value={newYear}
                            onChange={(e) => setNewYear(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-xs text-white"
                          >
                            <option value={1}>1st Year</option>
                            <option value={2}>2nd Year</option>
                            <option value={3}>3rd Year</option>
                            <option value={4}>4th Year</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Semester</label>
                          <select
                            value={newSemester}
                            onChange={(e) => setNewSemester(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-xs text-white"
                          >
                            <option value={1}>1st Sem</option>
                            <option value={2}>2nd Sem</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Section #</label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={newSectionNumber}
                            onChange={(e) => setNewSectionNumber(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-xs text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Action Bar */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handleModalClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isSingleValid || isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-amber-500/10 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Enrolling {clientType}...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" />
                      Enroll {clientType === "student" ? "Student" : "Staff Member"}
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* ========================================================================= */
            /* BULK IMPORT TAB                                                           */
            /* ========================================================================= */
            <div className="space-y-5">
              {/* Target Role & Download Template */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-slate-400">Target Role:</label>
                  <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setBulkClientType("student");
                        if (rawPastedText) parseRawText(rawPastedText, "student");
                      }}
                      className={`px-3 py-1 rounded-md transition-all font-semibold ${
                        bulkClientType === "student"
                          ? "bg-amber-500 text-slate-950"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Students
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkClientType("staff");
                        if (rawPastedText) parseRawText(rawPastedText, "staff");
                      }}
                      className={`px-3 py-1 rounded-md transition-all font-semibold ${
                        bulkClientType === "staff"
                          ? "bg-amber-500 text-slate-950"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Staff
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => downloadCsvTemplate(bulkClientType)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors"
                >
                  <Download className="h-3.5 w-3.5 text-amber-400" />
                  Download {bulkClientType === "student" ? "Student" : "Staff"} CSV Template
                </button>
              </div>

              {/* Upload vs Paste Toggle */}
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                <button
                  type="button"
                  onClick={() => setBulkInputMode("upload")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                    bulkInputMode === "upload"
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  File Upload (.csv, .tsv, .json)
                </button>
                <button
                  type="button"
                  onClick={() => setBulkInputMode("paste")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                    bulkInputMode === "paste"
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Direct Text Paste
                </button>
              </div>

              {/* Upload Zone or Paste Textarea */}
              {bulkInputMode === "upload" ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.json,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="bulk-file-input"
                  />
                  <label
                    htmlFor="bulk-file-input"
                    className="border-2 border-dashed border-slate-700/80 hover:border-amber-500/60 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-900/20 hover:bg-slate-900/40 transition-all text-center group"
                  >
                    <div className="h-12 w-12 rounded-full bg-slate-800 group-hover:bg-amber-500/20 flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition-colors mb-3">
                      <Upload className="h-6 w-6" />
                    </div>
                    {fileName ? (
                      <div>
                        <div className="text-sm font-bold text-white flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          {fileName}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Click to select a different roster file
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs font-semibold text-white">
                          Click to browse or drop {bulkClientType} roster file
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Accepts CSV, TSV, or JSON array
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Paste CSV or JSON Content:
                  </label>
                  <textarea
                    rows={6}
                    value={rawPastedText}
                    onChange={handlePastedTextChange}
                    placeholder={
                      bulkClientType === "student"
                        ? "student_id,name,email,course_name,year,semester,section_number,phone_number\n02000301199,Jyrum Jaro,jyrum@urdaneta.sti.edu.ph,BSCS,4,1,1,09123456789"
                        : "staff_id,name,email\nEMP-101,Dr. Alan Turing,turing@urdaneta.sti.edu.ph"
                    }
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-amber-500/60 transition-colors"
                  />
                </div>
              )}

              {/* Live Parsing Preview & Statistics */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      Parsing Preview ({parsedRows.length} total)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 font-semibold text-[11px]">
                        {validBulkRows.length} Valid
                      </span>
                      {invalidBulkRows.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-950/40 border border-rose-500/40 text-rose-400 font-semibold text-[11px]">
                          {invalidBulkRows.length} Invalid
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden max-h-56 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/90 text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">ID</th>
                          <th className="py-2 px-3">Name</th>
                          <th className="py-2 px-3">Email</th>
                          {bulkClientType === "student" && <th className="py-2 px-3">Program/Sec</th>}
                          <th className="py-2 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
                        {parsedRows.map((r) => (
                          <tr
                            key={r.rowNum}
                            className={`hover:bg-slate-900/40 ${
                              !r.isValid ? "bg-rose-950/20 text-rose-300" : ""
                            }`}
                          >
                            <td className="py-1.5 px-3 font-mono text-slate-500">{r.rowNum}</td>
                            <td className="py-1.5 px-3 font-mono font-medium text-white">{r.id || "—"}</td>
                            <td className="py-1.5 px-3 truncate max-w-[120px]">{r.name}</td>
                            <td className="py-1.5 px-3 truncate max-w-[150px]">{r.email || "—"}</td>
                            {bulkClientType === "student" && (
                              <td className="py-1.5 px-3 truncate max-w-[120px]">
                                {r.course || "Default"} {r.year && `${r.year}/${r.semester}-${r.section}`}
                              </td>
                            )}
                            <td className="py-1.5 px-3 text-right">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-400" title={r.error}>
                                  <AlertCircle className="h-3 w-3" />
                                  {r.error}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Bulk Action Bar */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handleModalClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkSubmit}
                  disabled={validBulkRows.length === 0 || isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-amber-500/10 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Importing {validBulkRows.length} records...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Import {validBulkRows.length} {bulkClientType === "student" ? "Students" : "Staff"}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
