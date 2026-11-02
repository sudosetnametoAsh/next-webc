"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Sparkles,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  Loader2,
  FileText,
  User,
  GraduationCap,
  Briefcase,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import type { getRecentSubmissionsPromise } from "@/modules/staff/application/repository/dashboard-repository";
import SubmissionModal, {
  SubmittedFile,
} from "../clients/sumission-modal";
import { createClient } from "@/lib/db/supabase-client";
import { shrinkCourseName } from "@/utils/formatters";

interface SubmissionsDeskClientProps {
  initialSubmissions: getRecentSubmissionsPromise[];
  department?: string;
  userName?: string;
}

type StatusFilter = "all" | "verified" | "flagged" | "needs_review";

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Recently";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 0 || diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

function formatExactDate(dateString: string | null): string {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function SubmissionsDeskClient({
  initialSubmissions = [],
  department = "Department",
  userName = "Staff Officer",
}: SubmissionsDeskClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [submissions, setSubmissions] = useState<getRecentSubmissionsPromise[]>(initialSubmissions);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");

  // Review Modal States
  const [activeSubmission, setActiveSubmission] = useState<getRecentSubmissionsPromise | null>(null);
  const [modalFiles, setModalFiles] = useState<SubmittedFile[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [isBatchAuthorizing, setIsBatchAuthorizing] = useState(false);

  // Sync state if initialSubmissions prop updates
  useEffect(() => {
    setSubmissions(initialSubmissions);
  }, [initialSubmissions]);

  // Realtime Supabase updates on clearance_tasks
  useEffect(() => {
    const channel = supabase
      .channel("department-submissions-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clearance_tasks",
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  // Derived counts for macro metrics ribbon
  const stats = useMemo(() => {
    const total = submissions.length;
    let verified = 0;
    let flagged = 0;
    let needsReview = 0;

    for (const sub of submissions) {
      if (sub.status === "Verified") verified++;
      else if (sub.status === "Flagged") flagged++;
      else needsReview++;
    }

    return { total, verified, flagged, needsReview };
  }, [submissions]);

  // Extract distinct course list for dropdown filter
  const distinctCourses = useMemo(() => {
    const set = new Set<string>();
    for (const sub of submissions) {
      if (sub.course) set.add(sub.course);
    }
    return Array.from(set).sort();
  }, [submissions]);

  // Filtered submissions based on search, status tab, and course
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // 1. Status Filter
      if (statusFilter === "verified" && sub.status !== "Verified") return false;
      if (statusFilter === "flagged" && sub.status !== "Flagged") return false;
      if (
        statusFilter === "needs_review" &&
        (sub.status === "Verified" || sub.status === "Flagged")
      )
        return false;

      // 2. Course Filter
      if (courseFilter !== "all" && sub.course !== courseFilter) return false;

      // 3. Search Term Filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = sub.studentName?.toLowerCase().includes(query);
        const matchesId = sub.studentId?.toLowerCase().includes(query);
        const matchesTask = sub.taskTitle?.toLowerCase().includes(query);
        const matchesCourse = sub.course?.toLowerCase().includes(query);
        return Boolean(matchesName || matchesId || matchesTask || matchesCourse);
      }

      return true;
    });
  }, [submissions, statusFilter, courseFilter, search]);

  // Open inspection modal
  const handleOpenReview = (submission: getRecentSubmissionsPromise) => {
    setActiveSubmission(submission);
    const formattedDate = submission.uploadedAt
      ? new Date(submission.uploadedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Unknown Date";

    if (submission.dropbox) {
      try {
        const parsed = JSON.parse(submission.dropbox);
        if (Array.isArray(parsed)) {
          setModalFiles(
            parsed.map((file: any, index: number) => ({
              id: file.id || String(index),
              name: file.name || "Uploaded File",
              size: file.size || "N/A",
              type: file.type || (file.name?.endsWith(".pdf") ? "pdf" : "image"),
              uploadDate: submission.uploadedAt || formattedDate,
              url: file.url || "#",
            }))
          );
        } else {
          throw new Error("Not an array");
        }
      } catch {
        const isPdf = submission.dropbox.toLowerCase().includes(".pdf");
        setModalFiles([
          {
            id: "1",
            name: decodeURIComponent(submission.dropbox.split("/").pop() || "Uploaded File"),
            size: "N/A",
            type: isPdf ? "pdf" : "image",
            uploadDate: submission.uploadedAt || formattedDate,
            url: submission.dropbox,
          },
        ]);
      }
    } else {
      setModalFiles([]);
    }

    setReviewModalOpen(true);
  };

  // Status update handler (Approve / Clear)
  const handleUpdateStatus = async (newStatus: "Cleared" | "Flagged", comment: string) => {
    if (!activeSubmission) return;
    try {
      const { error } = await supabase
        .from("clearance_tasks")
        .update({ status: newStatus, comments: comment })
        .eq("assigned_task_id", activeSubmission.assignedTaskId);

      if (error) throw error;
      setReviewModalOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Failed to update task status:", err);
    }
  };

  // Rejection handler
  const handleRejectWithResubmit = async (comment: string) => {
    if (!activeSubmission) return;
    try {
      let cleanAiAuditReport: any = activeSubmission.aiAuditReport;
      if (cleanAiAuditReport && typeof cleanAiAuditReport === "object") {
        const { appeal, ...rest } = cleanAiAuditReport;
        cleanAiAuditReport = Object.keys(rest).length > 0 ? rest : null;
      }

      const { error } = await supabase
        .from("clearance_tasks")
        .update({
          status: "Rejected",
          comments: comment,
          ai_audit_report: cleanAiAuditReport,
        })
        .eq("assigned_task_id", activeSubmission.assignedTaskId);

      if (error) throw error;

      if (activeSubmission.studentId) {
        try {
          await supabase.from("notifications").insert({
            user_id: activeSubmission.studentId,
            target_role: "student",
            category: "submission",
            title: "Submission Rejected",
            description: `Your submission for "${activeSubmission.taskTitle || "requirement"}" was rejected. Reason: ${comment}`,
            type: "Warning",
            ref_url: `/clearance/tasks?taskId=${activeSubmission.assignedTaskId}`,
            is_read: false,
            metadata: {
              studentId: activeSubmission.studentId,
              taskId: activeSubmission.assignedTaskId,
              taskTitle: activeSubmission.taskTitle,
              reason: comment,
            },
          });
        } catch (notifErr) {
          console.error("Failed to insert reject notification:", notifErr);
        }
      }

      setReviewModalOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Failed to reject task with resubmit:", err);
    }
  };

  // Batch authorize all AI-verified documents
  const handleBatchAuthorizeVerified = async () => {
    const verifiedTasks = submissions.filter((s) => s.status === "Verified");
    if (verifiedTasks.length === 0) return;

    setIsBatchAuthorizing(true);
    try {
      const taskIds = verifiedTasks.map((t) => t.assignedTaskId);
      const res = await fetch("/api/department/clients/tasks/batch-authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds }),
      });

      if (!res.ok) {
        throw new Error("Failed to batch authorize verified tasks");
      }

      router.refresh();
    } catch (err) {
      console.error("Batch authorize error:", err);
    } finally {
      setIsBatchAuthorizing(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Inbox className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Submissions Review Desk
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Inspect, verify, and authorize submitted clearance documents for {department}
          </p>
        </div>

        {stats.verified > 0 && (
          <button
            type="button"
            onClick={handleBatchAuthorizeVerified}
            disabled={isBatchAuthorizing}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50 self-start sm:self-auto shrink-0"
          >
            {isBatchAuthorizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
            )}
            <span>Batch Authorize All Verified ({stats.verified})</span>
          </button>
        )}
      </div>

      {/* ── 2. Top Metrics Ribbon ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Queue */}
        <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Queue
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Inbox className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold text-white font-mono">
            {stats.total}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Submissions awaiting action</p>
        </div>

        {/* AI Verified (Factor 1 Passed) */}
        <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              AI Verified
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
            {stats.verified}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Ready for Factor 2 authorization</p>
        </div>

        {/* Flagged Anomalies */}
        <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Flagged Anomalies
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold text-rose-400 font-mono">
            {stats.flagged}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">ID, name, or doc mismatches</p>
        </div>

        {/* Needs Manual Review */}
        <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Manual Review
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-bold text-slate-200 font-mono">
            {stats.needsReview}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">Standard review queue</p>
        </div>
      </div>

      {/* ── 3. Filters & Search Toolbar ── */}
      <div className="rounded-2xl border border-slate-800 bg-[#0a101f] p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === "all"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                  : "bg-[#070c18] border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("verified")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                statusFilter === "verified"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold"
                  : "bg-[#070c18] border border-slate-800 text-emerald-400 hover:border-emerald-500/40"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              <span>AI Verified ({stats.verified})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("flagged")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                statusFilter === "flagged"
                  ? "bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20 font-bold"
                  : "bg-[#070c18] border border-slate-800 text-rose-400 hover:border-rose-500/40"
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              <span>Flagged ({stats.flagged})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("needs_review")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                statusFilter === "needs_review"
                  ? "bg-slate-700 text-white font-bold"
                  : "bg-[#070c18] border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>Needs Review ({stats.needsReview})</span>
            </button>
          </div>

          {/* Search & Program Filter */}
          <div className="flex items-center gap-2.5 flex-1 md:max-w-md">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, ID, or task title..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#070c18] border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
              />
            </div>

            {/* Course Filter Dropdown */}
            {distinctCourses.length > 0 && (
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-[#070c18] border border-slate-800 text-slate-300 focus:outline-none focus:border-amber-500/60 transition-all cursor-pointer"
              >
                <option value="all">All Programs</option>
                {distinctCourses.map((c) => (
                  <option key={c} value={c}>
                    {shrinkCourseName(c)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* ── 4. Submissions Feed List ── */}
        <div className="space-y-2.5 pt-2">
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-16 bg-[#070c18]/60 rounded-xl border border-slate-800/80">
              <Inbox className="mx-auto h-10 w-10 text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-300">
                No submissions matching your filter
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {search || statusFilter !== "all" || courseFilter !== "all"
                  ? "Try resetting your search query or status filter to see all submissions."
                  : "All clear! There are currently no pending document submissions for your department."}
              </p>
            </div>
          ) : (
            filteredSubmissions.map((sub) => {
              const isStaff =
                !sub.course || sub.course.toLowerCase().includes("staff");
              const shortCode = isStaff
                ? "STAFF"
                : shrinkCourseName(sub.course);

              const initials = (sub.studentName || sub.studentId || "CL")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              const isVerified = sub.status === "Verified";
              const isFlagged = sub.status === "Flagged";

              return (
                <div
                  key={sub.assignedTaskId}
                  onClick={() => handleOpenReview(sub)}
                  className="rounded-xl border border-slate-800/90 bg-[#070c18]/80 p-3.5 sm:p-4 hover:border-amber-500/40 hover:bg-[#0c1427]/90 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                >
                  {/* Left: Avatar + Client Meta + Task Title */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/70 text-xs font-bold text-amber-400 group-hover:border-amber-500/40 group-hover:bg-amber-500/10 transition-colors">
                      {initials}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                          {sub.studentName}
                        </h4>
                        <span className="text-xs font-mono text-slate-500">
                          {sub.studentId}
                        </span>
                        <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-300">
                          {shortCode} {sub.section ? `· ${sub.section}` : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-300 truncate">
                        <FileText className="h-3.5 w-3.5 text-amber-400/80 shrink-0" />
                        <span className="font-semibold text-white truncate">
                          {sub.taskTitle}
                        </span>
                        <span className="text-slate-500 hidden sm:inline">·</span>
                        <span className="text-slate-400 text-[11px] hidden sm:inline">
                          {formatRelativeTime(sub.uploadedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: AI Forensic Pill + Review Button */}
                  <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                    {isVerified ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-mono font-bold text-emerald-300 shadow-xs">
                        <Sparkles className="h-3 w-3 text-emerald-400" />
                        <span>AI Verified</span>
                      </span>
                    ) : isFlagged ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-xs font-mono font-bold text-rose-300 shadow-xs">
                        <AlertTriangle className="h-3 w-3 text-rose-400" />
                        <span>Flagged</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-mono font-medium text-slate-300">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>Needs Review</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenReview(sub);
                      }}
                      className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-semibold text-white group-hover:border-amber-500/40 group-hover:bg-amber-500/10 group-hover:text-amber-300 transition-all cursor-pointer"
                    >
                      <span>Review</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-300 transition-colors" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 5. Document Review Modal ── */}
      {activeSubmission && (
        <SubmissionModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          studentName={activeSubmission.studentName || activeSubmission.studentId}
          taskTitle={activeSubmission.taskTitle}
          lastUpdated={activeSubmission.uploadedAt || "Recently"}
          files={modalFiles}
          status={activeSubmission.status}
          comments={activeSubmission.comments}
          aiAuditReport={activeSubmission.aiAuditReport}
          onUpdateStatus={handleUpdateStatus}
          onRejectWithResubmit={handleRejectWithResubmit}
          viewType={
            activeSubmission.course?.toLowerCase().includes("staff")
              ? "staff"
              : "students"
          }
        />
      )}
    </section>
  );
}
