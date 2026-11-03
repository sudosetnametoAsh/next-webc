"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FlaskConical,
  CreditCard,
  Layers,
  FileSpreadsheet,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Play,
  ArrowRight,
  RefreshCw,
  Building2,
  ShieldCheck,
  Terminal,
  Send,
  Zap,
  User,
  Users,
  CheckCheck,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  Search,
} from "lucide-react";
import { getDepartmentIcon } from "@/lib/department-icons";

type SimulationNavTab = "client" | "department" | "admin";

interface StudentOption {
  student_id: string;
  student_name: string;
  course_name: string;
  type?: "student" | "staff";
}

interface CourseOption {
  course_id: number;
  course_name: string;
  student_count: number;
}

interface DepartmentOption {
  dept_id: number;
  dept_name: string;
  icon_name?: string | null;
  tier: number;
}

interface ClearanceRecordItem {
  clearance_id: number;
  status: string;
  signed_at: string | null;
  created_at: string;
  tier: number;
  dept_id: number;
  dept_name: string;
  icon_name?: string | null;
}

interface NotificationItem {
  notif_id: number;
  title: string;
  description: string;
  type: string;
  is_read: boolean;
  created_at: string;
  category?: string;
}

interface CurrentStudentData {
  student_id: string;
  student_name: string;
  course_name: string;
  type?: "student" | "staff";
  clearances: ClearanceRecordItem[];
  notifications: NotificationItem[];
}

interface SimulationLog {
  id: string;
  timestamp: string;
  type: "webhook" | "sign" | "revert" | "time" | "reset" | "import" | "batch" | "bottleneck";
  title: string;
  detail: string;
  status: "success" | "error" | "info";
}

export default function SimulationClient() {
  // Navigation tabs: client, department, admin
  const [activeTab, setActiveTab] = useState<SimulationNavTab>("client");

  // Client Selection & Simulation Data
  const [selectedStudentId, setSelectedStudentId] = useState("02000248919");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [studentsList, setStudentsList] = useState<StudentOption[]>([]);
  const [coursesList, setCoursesList] = useState<CourseOption[]>([]);
  const [departmentsList, setDepartmentsList] = useState<DepartmentOption[]>([]);
  const [studentData, setStudentData] = useState<CurrentStudentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Batch Sign Course Feature States
  const [selectedCourseId, setSelectedCourseId] = useState<number>(1);

  // Admin Bottleneck Feature States
  const [selectedBottleneckDept, setSelectedBottleneckDept] = useState<string>("Cashier");
  const [bottleneckScope, setBottleneckScope] = useState<"single" | "all">("single");
  const [bottleneckHours, setBottleneckHours] = useState<number>(24);

  // Activity logs
  const [logs, setLogs] = useState<SimulationLog[]>([]);

  const addLog = useCallback(
    (
      type: SimulationLog["type"],
      title: string,
      detail: string,
      status: SimulationLog["status"] = "info"
    ) => {
      const newLog: SimulationLog = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        type,
        title,
        detail,
        status,
      };
      setLogs((prev) => [newLog, ...prev.slice(0, 49)]);
    },
    []
  );

  // Fetch simulation data
  const loadData = useCallback(async (studentIdToFetch?: string) => {
    setIsLoading(true);
    const sId = studentIdToFetch || selectedStudentId;
    try {
      const res = await fetch(`/api/admin/simulation?studentId=${sId}`);
      if (!res.ok) throw new Error("Failed to load simulation data");
      const data = await res.json();
      setStudentsList(data.students || []);
      setCoursesList(data.courses || []);
      setDepartmentsList(data.departments || []);
      setStudentData(data.currentStudent || null);

      if (data.courses?.length > 0 && !selectedCourseId) {
        setSelectedCourseId(data.courses[0].course_id);
      }
      if (data.departments?.length > 0 && !selectedBottleneckDept) {
        setSelectedBottleneckDept(data.departments[0].dept_name);
      }
    } catch (err: any) {
      addLog("reset", "Fetch Error", err.message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [selectedStudentId, selectedCourseId, selectedBottleneckDept, addLog]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStudentChange = (newId: string) => {
    setSelectedStudentId(newId);
    loadData(newId);
    addLog("info" as any, "Client Selected", `Switched active simulation client to ${newId}`, "info");
  };

  // Filtered clients list for quick search
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return studentsList;
    const q = clientSearchQuery.toLowerCase();
    return studentsList.filter(
      (s) =>
        s.student_id.toLowerCase().includes(q) ||
        s.student_name.toLowerCase().includes(q) ||
        s.course_name.toLowerCase().includes(q)
    );
  }, [studentsList, clientSearchQuery]);

  // ── 1. Cashier Webhook Simulation ──
  const handleCashierWebhook = async (action: "settle" | "revoke") => {
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/webhooks/cashier", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cashier-secret": "cashier_webhook_secret_key_2026",
        },
        body: JSON.stringify({
          student_id: selectedStudentId,
          studentId: selectedStudentId,
          userId: selectedStudentId,
          action,
          balance: action === "settle" ? 0 : 1500,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      addLog(
        "webhook",
        `Cashier Webhook: ${action === "settle" ? "Settlement Received" : "Settlement Revoked"}`,
        action === "settle"
          ? "Direct event signing cleared Cashier clearance & Tier 2 'Ready for Signing' alerts dispatched."
          : "Cashier clearance reverted to Pending. Higher tier clearances blocked.",
        "success"
      );
      await loadData();
    } catch (err: any) {
      addLog("webhook", "Cashier Webhook Failed", err.message, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── 2. Individual Department Sign / Revert ──
  const handleSignOffice = async (clearanceId: number, tier: number, deptName: string) => {
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/admin/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign",
          userId: selectedStudentId,
          clearanceId,
          tier,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sign failed");

      addLog(
        "sign",
        `Signed ${deptName} (Phase ${tier})`,
        json.message || "Signed clearance record and dispatched downstream notifications.",
        "success"
      );
      await loadData();
    } catch (err: any) {
      addLog("sign", `Failed to sign ${deptName}`, err.message, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRevertOffice = async (clearanceId: number, deptName: string) => {
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/admin/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revert",
          userId: selectedStudentId,
          clearanceId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Revert failed");

      addLog("revert", `Reverted ${deptName}`, `Clearance returned to Pending status.`, "info");
      await loadData();
    } catch (err: any) {
      addLog("revert", `Failed to revert ${deptName}`, err.message, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── 3. Sign All & Revert All Clearances for Client ──
  const handleSignAllClearances = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/admin/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign_all",
          userId: selectedStudentId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sign all failed");

      addLog(
        "sign",
        `Signed All Clearances: ${studentData?.student_name}`,
        json.message || "All clearance records signed. Ready for signing & completion dispatched.",
        "success"
      );
      await loadData();
    } catch (err: any) {
      addLog("sign", "Sign All Failed", err.message, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRevertAllClearances = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/admin/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revert_all",
          userId: selectedStudentId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Revert all failed");

      addLog(
        "revert",
        `Reverted All Clearances: ${studentData?.student_name}`,
        json.message || "All clearance departments returned to Pending.",
        "info"
      );
      await loadData();
    } catch (err: any) {
      addLog("revert", "Revert All Failed", err.message, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── 4. Batch Sign Course Prerequisite (Demonstrate Batch Notif) ──
  const handleBatchSignCoursePrerequisite = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/admin/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_sign_course",
          courseId: selectedCourseId,
          deptName: "Cashier",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Batch sign failed");

      addLog(
        "batch",
        `Batch Prerequisite Signed (${json.courseName || `Course #${selectedCourseId}`})`,
        json.message || "Batch sign complete. Grouped notification broadcast dispatched.",
        "success"
      );
      await loadData();
    } catch (err: any) {
      addLog("batch", "Batch Sign Failed", err.message, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBatchRevertCoursePrerequisite = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/admin/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_revert_course",
          courseId: selectedCourseId,
          deptName: "Cashier",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Batch revert failed");

      addLog(
        "revert",
        `Batch Prerequisite Reverted (Course #${selectedCourseId})`,
        json.message || "Reverted Cashier records to Pending.",
        "info"
      );
      await loadData();
    } catch (err: any) {
      addLog("revert", "Batch Revert Failed", err.message, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── 5. Admin Bottleneck Simulation Feature ──
  const handleInjectBottleneck = async (hours: number) => {
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/admin/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bottleneck",
          deptName: selectedBottleneckDept,
          hours,
          scope: bottleneckScope,
          userId: selectedStudentId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Bottleneck simulation failed");

      addLog(
        "bottleneck",
        hours > 0 ? `Bottleneck Dwell (+${hours}h): ${selectedBottleneckDept}` : `Bottleneck Cleared (0h): ${selectedBottleneckDept}`,
        json.message || `Applied ${hours}h dwell time to ${selectedBottleneckDept}.`,
        hours > 0 ? "info" : "success"
      );
      await loadData();
    } catch (err: any) {
      addLog("bottleneck", "Bottleneck Simulation Failed", err.message, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── 6. SIS Enrollment Import Simulation ──
  const handleImportEnrollments = async () => {
    setIsActionLoading(true);
    const demoPayload = [
      {
        student_id: "02000991101",
        student_name: "Simulated Student A (CS)",
        course: "BSCS",
        section: "1-1",
      },
      {
        student_id: "02000991102",
        student_name: "Simulated Student B (IT)",
        course: "BSIT",
        section: "1-1",
      },
    ];

    try {
      const res = await fetch("/api/admin/enrollments/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollments: demoPayload }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed");

      addLog(
        "import",
        "SIS Bulk Ingestion Simulated",
        `Imported 2 simulated students with courses, sections, and provisioned clearance records.`,
        "success"
      );
      await loadData();
    } catch (err: any) {
      addLog("import", "Enrollment Ingestion Failed", err.message, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── 7. One-Click Demo Reset ──
  const handleResetBaseline = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/admin/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset",
          userId: selectedStudentId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Reset failed");

      addLog(
        "reset",
        "Demo Baseline Restored",
        `Reset ${selectedStudentId}: all clearances Pending, and test notifications cleared.`,
        "success"
      );
      await loadData();
    } catch (err: any) {
      addLog("reset", "Reset Failed", err.message, "error");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Categorize clearances by tier for current client
  const tier1Clearances = (studentData?.clearances || []).filter((c) => c.tier === 1);
  const tier2Clearances = (studentData?.clearances || []).filter((c) => c.tier === 2);
  const tier3Clearances = (studentData?.clearances || []).filter((c) => c.tier >= 3);

  const isTier1Signed = tier1Clearances.length > 0 && tier1Clearances.every((c) => c.status === "Signed");
  const isTier2AllSigned = tier2Clearances.length > 0 && tier2Clearances.every((c) => c.status === "Signed");
  const isAllSigned =
    (studentData?.clearances || []).length > 0 &&
    (studentData?.clearances || []).every((c) => c.status === "Signed");

  return (
    <div className="w-full space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">
                Simulation &amp; Demonstration Console
              </h1>
              <p className="text-xs text-slate-400">
                Interactive sandbox for role-based clearance testing, batch notifications, and dwell bottleneck modeling.
              </p>
            </div>
          </div>
        </div>

        {/* Global Refresh */}
        <button
          type="button"
          onClick={() => loadData()}
          disabled={isLoading || isActionLoading}
          className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#070c18] px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-amber-400" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* ── 3 NAVIGATION BUTTONS FOR SIMULATION (Client, Department, Admin) ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("client")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-ui cursor-pointer ${
            activeTab === "client"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "bg-[#0a101f] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700"
          }`}
        >
          <User className="h-4 w-4" />
          <span>Client Simulation</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
              activeTab === "client" ? "bg-slate-950/20 text-slate-950" : "bg-slate-800 text-slate-400"
            }`}
          >
            {studentsList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("department")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-ui cursor-pointer ${
            activeTab === "department"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "bg-[#0a101f] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Department Simulation</span>
          <span className="rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 text-[9px] uppercase font-bold tracking-wider">
            Coming Soon
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("admin")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-ui cursor-pointer ${
            activeTab === "admin"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
              : "bg-[#0a101f] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Admin Simulation</span>
          <span className="rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 text-[9px] uppercase font-bold tracking-wider">
            Bottlenecks
          </span>
        </button>
      </div>

      {/* ── Main View Container (Grid Layout: 8 cols controls, 4 cols live terminal) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Active Tab Modules */}
        <div className="lg:col-span-8 space-y-6">
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: CLIENT SIMULATION                                              */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === "client" && (
            <div className="space-y-6">
              {/* 1. Client Selector Card across all clients with templates */}
              <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <User className="h-5 w-5 text-amber-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Select Client with Templates</h3>
                      <p className="text-xs text-slate-400">
                        Choose any student or staff member enrolled across active clearance templates.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-900 border border-slate-800 px-2.5 py-0.5 text-xs text-slate-400 font-mono">
                      {studentsList.length} Total Clients
                    </span>
                  </div>
                </div>

                {/* Dropdown Selection */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-8">
                    <div className="relative">
                      <select
                        value={selectedStudentId}
                        onChange={(e) => handleStudentChange(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-[#070c18] px-3.5 py-2.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500/60 cursor-pointer appearance-none pr-8"
                      >
                        {studentsList.map((s) => (
                          <option key={s.student_id} value={s.student_id} className="bg-[#0a101f] text-white">
                            [{s.type === "staff" ? "Staff" : "Student"}] {s.student_id} — {s.student_name} ({s.course_name})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Client Fast-Filter Search */}
                  <div className="md:col-span-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search ID / name..."
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-[#070c18] pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                      />
                    </div>
                  </div>
                </div>

                {/* Filter suggestions if searching */}
                {clientSearchQuery.trim() && (
                  <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-slate-800 bg-[#070c18] p-2">
                    {filteredClients.slice(0, 8).map((c) => (
                      <button
                        key={c.student_id}
                        type="button"
                        onClick={() => {
                          handleStudentChange(c.student_id);
                          setClientSearchQuery("");
                        }}
                        className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs flex items-center justify-between transition-colors ${
                          c.student_id === selectedStudentId
                            ? "bg-amber-500/15 text-amber-300 font-bold"
                            : "text-slate-300 hover:bg-slate-900"
                        }`}
                      >
                        <span className="truncate">
                          [{c.student_id}] {c.student_name}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{c.course_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Active Client Overview Strip with Sign All & Revert All */}
              <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Active Client Profile
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <h2 className="text-base font-bold text-white">{studentData?.student_name}</h2>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-300">
                        {studentData?.student_id}
                      </span>
                      <span className="rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 text-[10px] font-semibold">
                        {studentData?.type === "staff" ? "Staff Record" : "Student Record"}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 block mt-0.5">{studentData?.course_name}</span>
                  </div>

                  {/* Sign All and Revert All Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSignAllClearances}
                      disabled={isActionLoading || isAllSigned}
                      title="Signs all clearance department records for this client in one operation"
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-900/30 hover:bg-emerald-500 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <CheckCheck className="h-4 w-4" />
                      <span>Sign All</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRevertAllClearances}
                      disabled={isActionLoading}
                      title="Reverts all clearance records for this client back to Pending"
                      className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Revert All</span>
                    </button>
                  </div>
                </div>

                {/* Progress Indicators */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                  <div className="rounded-xl border border-slate-800/80 bg-[#070c18] p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Overall Progress
                    </span>
                    <div className="text-sm font-bold text-white mt-1">
                      {(studentData?.clearances || []).filter((c) => c.status === "Signed").length} /{" "}
                      {studentData?.clearances?.length || 0} Offices Signed
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800/80 bg-[#070c18] p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Phase 1 (Cashier)
                    </span>
                    <div
                      className={`text-sm font-bold mt-1 ${isTier1Signed ? "text-emerald-400" : "text-amber-400"}`}
                    >
                      {isTier1Signed ? "Cleared & Signed" : "Pending Prerequisite"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800/80 bg-[#070c18] p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Institutional Standing
                    </span>
                    <div
                      className={`text-sm font-bold mt-1 ${isAllSigned ? "text-purple-400" : "text-slate-300"}`}
                    >
                      {isAllSigned ? "Completed (Eligible for Sign-off)" : "Clearance In Progress"}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Individual Department Signing (Across corresponding departments from templates) */}
              <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Layers className="h-5 w-5 text-blue-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Individual Department Signing (Templates Pipeline)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Sign or revert departments individually according to assigned clearance phases.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Rule: Phase 1 → Phase 2 → Phase 3
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Phase 1: Cashier */}
                  <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        Phase 1: Foundation Prerequisite (Cashier)
                      </span>
                      <span className="text-[10px] text-slate-400">Must be signed first</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {tier1Clearances.length === 0 ? (
                        <div className="text-xs text-slate-500 italic p-2">
                          No Phase 1 template assigned to this client.
                        </div>
                      ) : (
                        tier1Clearances.map((c) => {
                          const isSigned = c.status === "Signed";
                          const DeptIcon = getDepartmentIcon(c.icon_name, c.dept_name) || Building2;
                          return (
                            <div
                              key={c.clearance_id}
                              className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#070c18] p-3"
                            >
                              <div className="flex items-center gap-2.5">
                                <DeptIcon className="h-4 w-4 text-amber-400" />
                                <span className="text-xs font-bold text-white">{c.dept_name}</span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    isSigned
                                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                      : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                  }`}
                                >
                                  {c.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {isSigned ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRevertOffice(c.clearance_id, c.dept_name)}
                                    disabled={isActionLoading}
                                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                                  >
                                    Revert
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSignOffice(c.clearance_id, c.tier, c.dept_name)}
                                    disabled={isActionLoading}
                                    className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                                  >
                                    Sign Cashier
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Phase 2: Parallel Departments */}
                  <div className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-400" />
                        Phase 2: Academic &amp; Student Affairs (Parallel Offices)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Unlocked when Phase 1 (Cashier) is Signed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {tier2Clearances.length === 0 ? (
                        <div className="text-xs text-slate-500 italic p-2 col-span-2">
                          No Phase 2 templates assigned to this client.
                        </div>
                      ) : (
                        tier2Clearances.map((c) => {
                          const isSigned = c.status === "Signed";
                          const DeptIcon = getDepartmentIcon(c.icon_name, c.dept_name) || Building2;
                          return (
                            <div
                              key={c.clearance_id}
                              className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#070c18] p-3"
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <DeptIcon className="h-4 w-4 text-blue-400 shrink-0" />
                                <span className="text-xs font-bold text-white truncate">{c.dept_name}</span>
                                <span
                                  className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold shrink-0 ${
                                    isSigned
                                      ? "bg-emerald-500/15 text-emerald-400"
                                      : "bg-amber-500/15 text-amber-400"
                                  }`}
                                >
                                  {c.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isSigned ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRevertOffice(c.clearance_id, c.dept_name)}
                                    disabled={isActionLoading}
                                    className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                                  >
                                    Revert
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSignOffice(c.clearance_id, c.tier, c.dept_name)}
                                    disabled={isActionLoading || !isTier1Signed}
                                    title={!isTier1Signed ? "Blocked: Tier 1 Cashier must sign first" : "Sign department"}
                                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold text-white transition-colors ${
                                      !isTier1Signed
                                        ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-500 cursor-pointer"
                                    }`}
                                  >
                                    Sign
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Phase 3: Registrar & Final Institutional */}
                  <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-purple-400" />
                        Phase 3: Final Institutional Sign-off (Registrar)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Eligible once ALL Phase 2 offices are Signed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {tier3Clearances.length === 0 ? (
                        <div className="text-xs text-slate-500 italic p-2">
                          No Phase 3 template assigned to this client.
                        </div>
                      ) : (
                        tier3Clearances.map((c) => {
                          const isSigned = c.status === "Signed";
                          const isEligible = isTier1Signed && isTier2AllSigned;
                          const DeptIcon = getDepartmentIcon(c.icon_name, c.dept_name) || Building2;
                          return (
                            <div
                              key={c.clearance_id}
                              className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#070c18] p-3"
                            >
                              <div className="flex items-center gap-2.5">
                                <DeptIcon className="h-4 w-4 text-purple-400" />
                                <span className="text-xs font-bold text-white">{c.dept_name}</span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    isSigned
                                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                      : "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                                  }`}
                                >
                                  {c.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {isSigned ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRevertOffice(c.clearance_id, c.dept_name)}
                                    disabled={isActionLoading}
                                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                                  >
                                    Revert
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSignOffice(c.clearance_id, c.tier, c.dept_name)}
                                    disabled={isActionLoading || !isEligible}
                                    title={!isEligible ? "Blocked: All Tier 2 offices must be signed first" : "Sign Registrar"}
                                    className={`rounded-lg px-3.5 py-1.5 text-xs font-bold text-white transition-colors ${
                                      !isEligible
                                        ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                        : "bg-purple-600 hover:bg-purple-500 cursor-pointer"
                                    }`}
                                  >
                                    Sign Registrar
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Batch Sign Course Prerequisite (Demonstrates Batch 'Ready for Signing' Notif) */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Users className="h-5 w-5 text-emerald-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Batch Sign Course Prerequisite (Demonstrate Batch Notification)
                      </h3>
                      <p className="text-xs text-slate-300">
                        Simulate clearing the prerequisite department (Cashier) for an entire course to demonstrate grouped &quot;Ready for Signing&quot; staff alerts.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-900/40 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 font-mono">
                    Tier 2 Cascade Trigger
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-7 space-y-2">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Target Course Program:
                    </label>
                    <div className="relative">
                      <select
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-800 bg-[#070c18] px-3.5 py-2.5 text-xs text-emerald-300 font-bold focus:outline-none focus:border-emerald-500/60 cursor-pointer appearance-none pr-8"
                      >
                        {coursesList.map((c) => (
                          <option key={c.course_id} value={c.course_id} className="bg-[#0a101f] text-white">
                            {c.course_name} ({c.student_count} Students)
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      Prerequisite Target: <strong className="text-slate-200">Phase 1 (Cashier)</strong> for all enrolled students.
                    </span>
                  </div>

                  <div className="md:col-span-5 flex flex-col sm:flex-row gap-2 pt-1 sm:pt-4">
                    <button
                      type="button"
                      onClick={handleBatchSignCoursePrerequisite}
                      disabled={isActionLoading}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-900/30 hover:bg-emerald-500 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <CheckCheck className="h-4 w-4" />
                      <span>Batch Sign Prerequisite</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleBatchRevertCoursePrerequisite}
                      disabled={isActionLoading}
                      title="Reverts Cashier clearance back to Pending for this course"
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. External Cashier Webhook Simulation */}
              <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="h-5 w-5 text-amber-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        External Cashier Webhook (Direct Event Ingestion)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Simulate bank terminal settlement or pos webhooks for active client ({studentData?.student_id}).
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-900 border border-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                    POST /api/webhooks/cashier
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCashierWebhook("settle")}
                    disabled={isActionLoading}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="h-4 w-4" />
                    <span>Settle &amp; Sign Cashier</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCashierWebhook("revoke")}
                    disabled={isActionLoading}
                    className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-4 py-2.5 text-xs font-bold text-rose-300 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Revoke Settlement / Hold</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: DEPARTMENT SIMULATION ("COMING SOON")                         */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === "department" && (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-[#0a101f] p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Building2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <span className="inline-block rounded-full bg-blue-500/15 border border-blue-500/30 px-3 py-1 text-xs font-bold text-blue-400 uppercase tracking-wider">
                  coming soon
                </span>
                <h3 className="text-lg font-bold text-white">Department Simulation Console</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Department-level simulation capabilities (workload routing, auto-audit overrides, requirement fulfillment, and staff queue assignment) are currently in development.
                </p>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: ADMIN SIMULATION (BOTTLENECK FEATURE & SIS INGESTION)          */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === "admin" && (
            <div className="space-y-6">
              {/* Bottleneck Feature Card */}
              <div className="rounded-2xl border border-purple-500/20 bg-purple-950/10 p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-5 w-5 text-purple-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Department Clearance Bottleneck Simulator
                      </h3>
                      <p className="text-xs text-slate-300">
                        Inject artificial elapsed dwell time into a specific department to simulate overdue clearance bottlenecks on the admin radar and velocity analytics.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-purple-900/40 border border-purple-500/40 px-2.5 py-0.5 text-[11px] font-bold text-purple-300 font-mono">
                    Radar Simulation
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Select Target Department */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">
                        Target Department:
                      </label>
                      <div className="relative">
                        <select
                          value={selectedBottleneckDept}
                          onChange={(e) => setSelectedBottleneckDept(e.target.value)}
                          className="w-full rounded-xl border border-slate-800 bg-[#070c18] px-3.5 py-2.5 text-xs text-purple-300 font-bold focus:outline-none focus:border-purple-500/60 cursor-pointer appearance-none pr-8"
                        >
                          {departmentsList.map((d) => (
                            <option key={d.dept_id} value={d.dept_name} className="bg-[#0a101f] text-white">
                              {d.dept_name} (Phase {d.tier})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                      </div>
                    </div>

                    {/* Target Scope */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">
                        Target Scope:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setBottleneckScope("single")}
                          className={`rounded-xl py-2 px-3 text-xs font-bold transition-ui ${
                            bottleneckScope === "single"
                              ? "bg-purple-600 text-white shadow-sm"
                              : "bg-[#070c18] border border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          Active Client Only
                        </button>
                        <button
                          type="button"
                          onClick={() => setBottleneckScope("all")}
                          className={`rounded-xl py-2 px-3 text-xs font-bold transition-ui ${
                            bottleneckScope === "all"
                              ? "bg-purple-600 text-white shadow-sm"
                              : "bg-[#070c18] border border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          All Clients in Dept
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Hours Adjustment & Presets */}
                  <div className="space-y-2 pt-2 border-t border-purple-500/20">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Elapsed Dwell Hours to Inject (Overdue Threshold: 24h):
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBottleneckHours(24);
                          handleInjectBottleneck(24);
                        }}
                        disabled={isActionLoading}
                        className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition-colors cursor-pointer"
                      >
                        +24 Hours (1 Day Overdue)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBottleneckHours(48);
                          handleInjectBottleneck(48);
                        }}
                        disabled={isActionLoading}
                        className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition-colors cursor-pointer"
                      >
                        +48 Hours (2 Days Overdue)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBottleneckHours(72);
                          handleInjectBottleneck(72);
                        }}
                        disabled={isActionLoading}
                        className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition-colors cursor-pointer"
                      >
                        +72 Hours (3 Days Overdue)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleInjectBottleneck(0)}
                        disabled={isActionLoading}
                        title="Resets created_at timestamp to now(), clearing bottleneck status"
                        className="rounded-xl border border-slate-800 bg-[#070c18] px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        Reset Dwell (0h)
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                      Example: Selecting <strong>Cashier</strong> and clicking <strong>+24 Hours</strong> shifts the clearance record creation date back by 24h. When dwell time exceeds the 24h limit, the department is dynamically flagged as an Overdue Bottleneck on the admin dashboard.
                    </p>
                  </div>
                </div>
              </div>

              {/* Secondary Admin Operations (SIS Ingestion & Baseline Demo Reset) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                      <h4 className="text-xs font-bold text-white">SIS Bulk Ingestion Simulator</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Simulate registrar bulk sync importing 2 new student records across BSCS &amp; BSIT programs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleImportEnrollments}
                    disabled={isActionLoading}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Simulate SIS Roster Sync</span>
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-rose-400" />
                      <h4 className="text-xs font-bold text-white">Baseline Demo Reset</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Reset active client ({selectedStudentId}) clearances back to Pending and purge test notifications.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetBaseline}
                    disabled={isActionLoading}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset Client Baseline</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Live Event Log & Dispatched Notifications */}
        <div className="lg:col-span-4 space-y-6">
          {/* Live Action & Event Terminal */}
          <div className="rounded-2xl border border-slate-800 bg-[#070c18] p-4 shadow-sm flex flex-col h-full min-h-[460px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Live Event Log
                </span>
              </div>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[550px] font-mono text-[11px]">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-600 text-center">
                  <Play className="h-6 w-6 mb-2 opacity-40" />
                  <span>Execute a simulation action on any tab to view live payload logs.</span>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`rounded-lg border p-2.5 transition-ui ${
                      log.status === "success"
                        ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                        : log.status === "error"
                        ? "border-rose-500/30 bg-rose-950/20 text-rose-300"
                        : "border-slate-800 bg-slate-900/60 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] opacity-75 mb-1">
                      <span className="uppercase font-bold tracking-wider">[{log.type}]</span>
                      <span>{log.timestamp}</span>
                    </div>
                    <span className="font-bold block text-white">{log.title}</span>
                    <p className="mt-1 text-[10px] text-slate-400 leading-relaxed font-sans">
                      {log.detail}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Database Notifications for Active Client */}
          <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Client Notifications ({studentData?.notifications?.length || 0})
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(studentData?.notifications || []).length === 0 ? (
                <span className="text-xs text-slate-500 block py-4 text-center">
                  No notifications recorded.
                </span>
              ) : (
                studentData?.notifications.map((n) => (
                  <div
                    key={n.notif_id}
                    className="rounded-lg border border-slate-800/80 bg-[#070c18] p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white truncate max-w-[180px]">{n.title}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                          n.is_read ? "bg-slate-800 text-slate-400" : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {n.is_read ? "Read" : "Unread"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">{n.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
