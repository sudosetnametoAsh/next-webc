"use client";

import { APP_TIME_ZONE } from "@/lib/date-time";


import { updateTaskStatus } from "@/lib/api/update-task-status";
import { rejectSubmission } from "@/lib/api/reject-submission";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Clock,
  AlertCircle,
  Inbox,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import type {
  getRecentSubmissionsPromise,
  ClientCoupledSubmissions,
} from "@/modules/staff/application/repository/dashboard-repository";
import SubmissionModal, {
  SubmittedFile,
} from "../clients/sumission-modal";
import { shrinkCourseName } from "@/utils/formatters";

interface RecentSubmissionsCardProps {
  submissions: getRecentSubmissionsPromise[];
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
    return date.toLocaleDateString("en-US", { timeZone: APP_TIME_ZONE, month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

export default function RecentSubmissionsCard({
  submissions = [],
}: RecentSubmissionsCardProps) {
  const router = useRouter();

  // Local state to support instant optimistic updates on approval / resubmission
  const [localSubmissions, setLocalSubmissions] =
    useState<getRecentSubmissionsPromise[]>(submissions);

  useEffect(() => {
    setLocalSubmissions(submissions);
  }, [submissions]);

  // Only tasks that are actively waiting for staff review (exclude Rejected, Cleared, Pending)
  const pendingSubmissions = useMemo(() => {
    return localSubmissions.filter(
      (s) => s.status === "Submitted" || s.status === "Verified" || s.status === "Flagged"
    );
  }, [localSubmissions]);

  // 1. Group individual task submissions by client (studentId)
  const coupledClients = useMemo<ClientCoupledSubmissions[]>(() => {
    const map = new Map<string, ClientCoupledSubmissions>();

    for (const sub of pendingSubmissions) {
      const key = sub.studentId;
      const existing = map.get(key);

      const isVerified = sub.status === "Verified";
      const isFlagged = sub.status === "Flagged";
      const isNeedsReview = sub.status === "Submitted";

      if (!existing) {
        map.set(key, {
          studentId: sub.studentId,
          clearanceId: sub.clearanceId,
          studentName: sub.studentName || sub.studentId,
          course: sub.course || "Staff",
          section: sub.section,
          latestUploadedAt: sub.uploadedAt,
          totalDocuments: 1,
          verifiedCount: isVerified ? 1 : 0,
          flaggedCount: isFlagged ? 1 : 0,
          needsReviewCount: isNeedsReview ? 1 : 0,
          documents: [sub],
        });
      } else {
        existing.documents.push(sub);
        existing.totalDocuments += 1;
        if (isVerified) existing.verifiedCount += 1;
        else if (isFlagged) existing.flaggedCount += 1;
        else existing.needsReviewCount += 1;

        // Compare timestamps to maintain the client's newest submission watermark
        if (sub.uploadedAt) {
          if (
            !existing.latestUploadedAt ||
            new Date(sub.uploadedAt).getTime() >
              new Date(existing.latestUploadedAt).getTime()
          ) {
            existing.latestUploadedAt = sub.uploadedAt;
          }
        }
      }
    }

    // Sort client groups by their latest activity watermark descending
    return Array.from(map.values()).sort((a, b) => {
      const timeA = a.latestUploadedAt ? new Date(a.latestUploadedAt).getTime() : 0;
      const timeB = b.latestUploadedAt ? new Date(b.latestUploadedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [pendingSubmissions]);

  // 2. Display strictly the top 5 most recently active clients
  const topClients = useMemo(() => {
    return coupledClients.slice(0, 5);
  }, [coupledClients]);

  // Accordion open/close state for droppable lists
  const [expandedClientIds, setExpandedClientIds] = useState<Set<string>>(new Set());

  const toggleExpand = (studentId: string) => {
    setExpandedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeSubmission, setActiveSubmission] =
    useState<getRecentSubmissionsPromise | null>(null);
  const [modalFiles, setModalFiles] = useState<SubmittedFile[]>([]);

  const handleOpenReview = (submission: getRecentSubmissionsPromise) => {
    setActiveSubmission(submission);
    const formattedDate = submission.uploadedAt
      ? new Date(submission.uploadedAt).toLocaleDateString("en-US", {
          timeZone: APP_TIME_ZONE,
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

  const handleUpdateStatus = async (newStatus: "Cleared" | "Flagged", comment: string) => {
    if (!activeSubmission) throw new Error("Select a submission first.");
    const currentSub = activeSubmission;
    await updateTaskStatus(currentSub.assignedTaskId, newStatus, comment);
    setLocalSubmissions((prev) => prev.filter((s) => s.assignedTaskId !== currentSub.assignedTaskId));
    setReviewModalOpen(false);
    router.refresh();
  };

  const handleRejectWithResubmit = async (comment: string) => {
    if (!activeSubmission) throw new Error("Select a submission first.");
    const currentSub = activeSubmission;
    await rejectSubmission(currentSub.assignedTaskId, comment);
    setLocalSubmissions((prev) =>
      prev.filter((s) => s.assignedTaskId !== currentSub.assignedTaskId)
    );
    setReviewModalOpen(false);
    router.refresh();
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl overflow-hidden flex flex-col h-[360px] md:h-[540px]">
        {/* ── Card Header (Matching Admin DepartmentClientProgress) ── */}
        <div className="px-3 py-3 md:px-6 md:py-4 border-b border-slate-800 bg-[#070c18] flex items-center justify-between gap-2 md:gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <FileText className="h-4 w-4" />
              </span>
              <h3 className="text-sm md:text-base font-bold text-white tracking-tight">
                Recent Submissions
              </h3>
            </div>
            <p className="mt-0.5 text-[11px] md:text-xs text-slate-400 truncate">
              Review submitted documents and track recent client submissions.
            </p>
          </div>
        </div>

        {/* ── Compact 5-Coupled Clients List (Matching Admin DepartmentClientProgress) ── */}
        <div className="p-3 md:p-5 space-y-2 md:space-y-2.5 flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-track]:bg-transparent">
          {topClients.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Inbox className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-400">
                All caught up!
              </p>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xs mx-auto">
                No pending document submissions currently requiring review.
              </p>
            </div>
          ) : (
            topClients.map((client) => {
              const initials = client.studentName
                ? client.studentName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : "ST";

              const isExpanded = expandedClientIds.has(client.studentId);
              const hasMultiple = client.documents.length > 1;

              return (
                <div
                  key={client.studentId}
                  onClick={() => {
                    if (hasMultiple) {
                      toggleExpand(client.studentId);
                    } else {
                      handleOpenReview(client.documents[0]);
                    }
                  }}
                  className={`rounded-xl border border-slate-800/80 bg-[#070c18]/80 p-2.5 md:p-3 transition-ui cursor-pointer group ${
                    hasMultiple
                      ? "hover:border-slate-700/90 hover:bg-slate-800/20"
                      : "hover:border-amber-500/40 hover:bg-[#0c1427]/90"
                  }`}
                >
                  {/* Client Summary Row */}
                  <div className="flex items-center justify-between gap-2 md:gap-3">
                    <div className="flex items-center gap-2 md:gap-2.5 min-w-0 flex-1">
                      {/* Avatar */}
                      <span className="flex h-7 w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800/60 text-xs font-bold text-amber-400 group-hover:border-amber-500/40 group-hover:bg-amber-500/10 transition-colors">
                        {initials}
                      </span>

                      {/* Client Meta */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap md:flex-nowrap items-center gap-1 md:gap-2">
                          <h4 className="text-[11px] md:text-sm font-bold text-white truncate max-w-full md:max-w-[200px]">
                            {client.studentName}
                          </h4>
                          <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] md:text-[11px] font-mono font-medium text-slate-300 shrink-0">
                            {shrinkCourseName(client.course)} {client.section ? `· ${client.section}` : ""}
                          </span>
                        </div>

                        {/* Subtext: Latest Requirement Preview & Timestamp */}
                        <div className="flex flex-wrap md:flex-nowrap items-center gap-1 md:gap-1.5 mt-0.5 text-[10px] md:text-xs text-slate-400">
                          <span className="text-slate-300 font-medium truncate max-w-full md:max-w-[220px]">
                            {hasMultiple
                              ? `${client.documents[0].taskTitle} + ${client.documents.length - 1} more`
                              : client.documents[0].taskTitle || "Clearance Requirement"}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono shrink-0">
                            · {formatRelativeTime(client.latestUploadedAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Status Badge aligned to middle */}
                    <div className="flex items-center gap-1 md:gap-2 shrink-0">
                      {/* Status Overview & Multi-Doc Badges */}
                      {hasMultiple ? (
                        client.verifiedCount === client.totalDocuments ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] md:text-[11px] font-mono font-bold text-emerald-300 shrink-0"
                              title={`${client.verifiedCount} AI Verified`}
                            >
                              <Sparkles className="h-2.5 w-2.5 text-emerald-400" />
                              <span>{client.verifiedCount}</span>
                            </span>
                          ) : client.flaggedCount === client.totalDocuments ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] md:text-[11px] font-mono font-bold text-rose-300 shrink-0"
                              title={`${client.flaggedCount} Flagged`}
                            >
                              <AlertCircle className="h-2.5 w-2.5 text-rose-400" />
                              <span>{client.flaggedCount}</span>
                            </span>
                          ) : client.needsReviewCount === client.totalDocuments ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] md:text-[11px] font-mono font-medium text-slate-300 shrink-0"
                              title={`${client.needsReviewCount} Needs Review`}
                            >
                              <Clock className="h-2.5 w-2.5 text-slate-400" />
                              <span>{client.needsReviewCount}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-800/80 px-2 py-0.5 text-[10px] md:text-[11px] font-mono shrink-0">
                              {client.flaggedCount > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 font-bold text-rose-300"
                                  title={`${client.flaggedCount} Flagged`}
                                >
                                  <AlertCircle className="h-2.5 w-2.5 text-rose-400" />
                                  <span>{client.flaggedCount}</span>
                                </span>
                              )}
                              {client.verifiedCount > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 font-bold text-emerald-300"
                                  title={`${client.verifiedCount} AI Verified`}
                                >
                                  <Sparkles className="h-2.5 w-2.5 text-emerald-400" />
                                  <span>{client.verifiedCount}</span>
                                </span>
                              )}
                              {client.needsReviewCount > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 font-medium text-slate-400"
                                  title={`${client.needsReviewCount} Needs Review`}
                                >
                                  <Clock className="h-2.5 w-2.5 text-slate-400" />
                                  <span>{client.needsReviewCount}</span>
                                </span>
                              )}
                            </span>
                          )
                      ) : client.flaggedCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] md:px-2.5 md:text-xs font-bold text-rose-300 shrink-0">
                          <AlertCircle className="h-3 w-3 text-rose-400" /> Flagged
                        </span>
                      ) : client.verifiedCount === 1 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] md:px-2.5 md:text-xs font-bold text-emerald-300 shrink-0">
                          <Sparkles className="h-3 w-3 text-emerald-400" /> AI Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] md:px-2.5 md:text-xs font-medium text-slate-300 shrink-0">
                          <Clock className="h-3 w-3 text-slate-400" /> Needs Review
                        </span>
                      )}

                      {/* Right Affordance: Chevron toggle for multi-docs */}
                      {hasMultiple && (
                        <ChevronDown
                          className={`h-4 w-4 text-slate-400 group-hover:text-slate-200 transition-transform duration-200 shrink-0 ${
                            isExpanded ? "rotate-180 text-amber-400" : ""
                          }`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Droppable Down Document List (Accordion) */}
                  {hasMultiple && isExpanded && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 pt-2 md:mt-3 md:pt-2.5 border-t border-slate-800/80 space-y-1.5 animate-in ease-out fade-in duration-200"
                    >
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
                        Requirements ({client.documents.length})
                      </div>

                      {client.documents.map((doc) => {
                        const isDocVerified = doc.status === "Verified";
                        const isDocFlagged = doc.status === "Flagged";

                        return (
                          <div
                            key={doc.assignedTaskId}
                            onClick={() => handleOpenReview(doc)}
                            className="flex items-center justify-between gap-2 md:gap-2 md:gap-3 p-2 md:p-2.5 rounded-lg bg-[#060a14]/80 border border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-800/50 transition-ui cursor-pointer group/doc"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-white group-hover/doc:text-amber-300 transition-colors truncate max-w-full md:max-w-[300px]">
                                {doc.taskTitle || "Clearance Requirement"}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                Uploaded {formatRelativeTime(doc.uploadedAt)}
                              </div>
                            </div>

                            {/* Right Side: Status Badge aligned to middle */}
                            <div className="flex items-center shrink-0">
                              {isDocVerified ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] md:text-[11px] font-bold text-emerald-300">
                                  <Sparkles className="h-2.5 w-2.5 text-emerald-400" /> AI Verified
                                </span>
                              ) : isDocFlagged ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] md:text-[11px] font-bold text-rose-300">
                                  <AlertCircle className="h-2.5 w-2.5 text-rose-400" /> Flagged
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] md:text-[11px] font-medium text-slate-300">
                                  <Clock className="h-2.5 w-2.5 text-slate-400" /> Needs Review
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
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
