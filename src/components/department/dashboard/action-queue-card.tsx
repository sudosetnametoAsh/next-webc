"use client";

import { updateTaskStatus } from "@/lib/api/update-task-status";
import { rejectSubmission } from "@/lib/api/reject-submission";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Clock,
  Eye,
  CheckCircle2,
  Check,
  AlertCircle,
  Inbox,
  ArrowUpRight,
  Loader2,
  UserCheck,
  Sparkles,
} from "lucide-react";
import type {
  getRecentSubmissionsPromise,
  ReadyToSignClient,
} from "@/modules/staff/application/repository/dashboard-repository";
import SubmissionModal, {
  SubmittedFile,
} from "../clients/sumission-modal";
import { toast } from "sonner";

interface ActionQueueCardProps {
  submissions: getRecentSubmissionsPromise[];
  readyToSignClients: ReadyToSignClient[];
}

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

export default function ActionQueueCard({
  submissions = [],
  readyToSignClients = [],
}: ActionQueueCardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"submissions" | "ready">("submissions");

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<getRecentSubmissionsPromise | null>(null);
  const [modalFiles, setModalFiles] = useState<SubmittedFile[]>([]);

  // Signing state
  const [signingId, setSigningId] = useState<number | null>(null);
  const [isBatchAuthorizing, setIsBatchAuthorizing] = useState(false);

  const handleBatchAuthorizeVerified = async () => {
    setIsBatchAuthorizing(true);
    try {
      const res = await fetch("/api/department/clients/tasks/batch-authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to batch authorize");
      toast.success("Verified tasks authorized");
      router.refresh();
    } catch (err) {
      console.error("Batch authorize error:", err);
      toast.error("Could not authorize verified tasks. Please try again.");
    } finally {
      setIsBatchAuthorizing(false);
    }
  };

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
              uploadDate: formattedDate,
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
            uploadDate: formattedDate,
            url: submission.dropbox,
          },
        ]);
      }
    } else {
      setModalFiles([]);
    }

    setReviewModalOpen(true);
  };

  const handleUpdateStatus = async (newStatus: "Cleared" | "Flagged", comment: string) => {
    if (!activeSubmission) throw new Error("Select a submission first.");
    const currentSub = activeSubmission;
    await updateTaskStatus(currentSub.assignedTaskId, newStatus, comment);
    setReviewModalOpen(false);
    router.refresh();
  };

  const handleRejectWithResubmit = async (comment: string) => {
    if (!activeSubmission) throw new Error("Select a submission first.");
    const currentSub = activeSubmission;
    await rejectSubmission(currentSub.assignedTaskId, comment);
    setReviewModalOpen(false);
    router.refresh();
  };

  const handleSignClearance = async (client: ReadyToSignClient) => {
    setSigningId(client.clearanceId);
    try {
      const res = await fetch("/api/department/clients/sign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [client.clearanceId],
          status: "Signed",
          signed_at: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to sign clearance");
      }
      toast.success("Clearance signed");
      router.refresh();
    } catch (err) {
      console.error("Signing failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to sign clearance");
    } finally {
      setSigningId(null);
    }
  };

  return (
    <>
      <div className="flex flex-col rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl overflow-hidden h-full">
        {/* ── Header with Segmented Filter Pills ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 bg-[#070c18] px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Operational Queue
              </h2>
              <p className="text-xs text-slate-400">
                Actionable tasks and clearance endorsements
              </p>
            </div>
          </div>

          {/* Segmented Tab Buttons */}
          <div className="inline-flex rounded-xl border border-slate-800 bg-[#060a14] p-1">
            <button
              type="button"
              onClick={() => setActiveTab("submissions")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-ui cursor-pointer ${
                activeTab === "submissions"
                  ? "border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Pending Submissions ({submissions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ready")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-ui cursor-pointer ${
                activeTab === "ready"
                  ? "border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Ready to Sign ({readyToSignClients.length})
            </button>
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 p-5 overflow-y-auto">
          {/* TAB 1: PENDING SUBMISSIONS */}
          {activeTab === "submissions" && (
            <div className="space-y-3">
              {/* Batch Factor-2 Authorization Banner for AI-Verified Submissions */}
              {submissions.filter((s) => s.status === "Verified").length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/20 text-emerald-400">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        {submissions.filter((s) => s.status === "Verified").length} Submission(s) Passed Factor 1 (AI Verified)
                      </p>
                      <p className="text-[11px] text-emerald-300/80">
                        Firsthand authenticity and identity match confirmed. Ready for final staff sign-off.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleBatchAuthorizeVerified}
                    disabled={isBatchAuthorizing}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-1.5 text-xs transition-ui shadow-sm shadow-emerald-500/20 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isBatchAuthorizing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Authorizing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                        <span>Authorize All ({submissions.filter((s) => s.status === "Verified").length})</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 text-slate-500 mb-3">
                    <Inbox className="h-6 w-6 stroke-1" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">
                    All caught up!
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    No pending document submissions currently requiring review.
                  </p>
                </div>
              ) : (
                submissions.map((sub) => {
                  const initials = sub.studentName
                    ? sub.studentName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "ST";

                  const isVerified = sub.status === "Verified";
                  const isFlagged = sub.status === "Flagged";

                  return (
                    <div
                      key={sub.assignedTaskId}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-[#070c18]/80 p-3.5 transition-ui hover:border-slate-700 hover:bg-[#070c18]"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/90 text-xs font-bold text-amber-400 shadow-xs mt-0.5">
                          {initials}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white text-sm truncate">
                              {sub.studentName}
                            </span>
                            <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-300">
                              {sub.course} {sub.section ? `· ${sub.section}` : ""}
                            </span>

                            {isVerified ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                <Sparkles className="h-3 w-3" /> AI Verified ({sub.aiAuditReport?.authenticityScore ?? 94}%)
                              </span>
                            ) : isFlagged ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                                <AlertCircle className="h-3 w-3" /> AI Flagged
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                                <Clock className="h-3 w-3" /> Needs Review
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-300">
                            <FileText className="h-3.5 w-3.5 text-amber-400/90 shrink-0" />
                            <span className="font-medium truncate">
                              {sub.taskTitle || "Clearance Requirement"}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>Submitted {formatRelativeTime(sub.uploadedAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Review Action CTA */}
                      <button
                        type="button"
                        onClick={() => handleOpenReview(sub)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 hover:border-amber-500/50 transition-ui cursor-pointer shrink-0"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Review</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: READY TO SIGN */}
          {activeTab === "ready" && (
            <div className="space-y-3">
              {readyToSignClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 text-slate-500 mb-3">
                    <UserCheck className="h-6 w-6 stroke-1" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">
                    No clients awaiting sign-off
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Students who complete their prerequisite phases and requirements will appear here for signing.
                  </p>
                </div>
              ) : (
                readyToSignClients.map((client) => {
                  const initials = client.studentName
                    ? client.studentName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "ST";

                  const isSigning = signingId === client.clearanceId;

                  return (
                    <div
                      key={client.clearanceId}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-[#070c18]/80 p-3.5 transition-ui hover:border-slate-700 hover:bg-[#070c18]"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-400 shadow-xs mt-0.5">
                          {initials}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white text-sm truncate">
                              {client.studentName}
                            </span>
                            <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-300">
                              {client.course} {client.section !== "N/A" ? `· ${client.section}` : ""}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>All prerequisites & tasks satisfied</span>
                          </div>

                          <span className="mt-0.5 text-[10px] text-slate-500 font-mono block">
                            ID: {client.studentId}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/department/clients`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="View in Clients directory"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleSignClearance(client)}
                          disabled={isSigning}
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 hover:text-emerald-200 transition-ui cursor-pointer disabled:opacity-50"
                        >
                          {isSigning ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Signing...</span>
                            </>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Sign Off</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Document Submission Modal ── */}
      {reviewModalOpen && (
        <SubmissionModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          studentName={activeSubmission?.studentName || "Student"}
          taskTitle={activeSubmission?.taskTitle}
          lastUpdated={activeSubmission?.uploadedAt || ""}
          files={modalFiles}
          status={activeSubmission?.status}
          comments={activeSubmission?.comments}
          aiAuditReport={activeSubmission?.aiAuditReport}
          onUpdateStatus={handleUpdateStatus}
          onRejectWithResubmit={handleRejectWithResubmit}
        />
      )}
    </>
  );
}
