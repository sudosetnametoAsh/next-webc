import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  X,
  Check,
  MessageSquare,
  Clock,
  FileBox,
  ExternalLink,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

// --- Types ---
export interface SubmittedFile {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  type: 'pdf' | 'image';
  url: string;
}

export interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  lastUpdated: string;
  files: SubmittedFile[];
  onUpdateStatus: (newStatus: 'Cleared' | 'Flagged', comment: string) => Promise<void>;
  /** New prop: Rejects the submission, clears the student's files, and sets status back to Pending */
  onRejectWithResubmit?: (comment: string) => Promise<void>;
  viewType?: 'students' | 'staff';
}

// --- Component ---
export default function SubmissionModal({
  isOpen,
  onClose,
  studentName,
  lastUpdated,
  files,
  onUpdateStatus,
  onRejectWithResubmit,
  viewType = 'students',
}: SubmissionModalProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [commentError, setCommentError] = useState('');

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onUpdateStatus('Cleared', comment);
      resetAndClose();
    } catch (error) {
      console.error('Failed to approve', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectClick = () => {
    // Require a comment before rejecting so the student knows what to fix
    if (!comment.trim()) {
      setCommentError('A reason is required when rejecting a submission.');
      return;
    }
    setCommentError('');
    setShowRejectConfirm(true);
  };

  const handleConfirmReject = async () => {
    setIsSubmitting(true);
    try {
      if (onRejectWithResubmit) {
        await onRejectWithResubmit(comment);
      } else {
        // Fallback if onRejectWithResubmit isn't provided
        await onUpdateStatus('Flagged', comment);
      }
      resetAndClose();
    } catch (error) {
      console.error('Failed to reject with resubmit', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentChange = (value: string) => {
    setComment(value);
    if (commentError && value.trim()) {
      setCommentError('');
    }
  };

  const resetAndClose = () => {
    setComment('');
    setShowRejectConfirm(false);
    setCommentError('');
    onClose();
  };

  if (!isOpen) return null;

  const personLabel = viewType === 'students' ? 'student' : 'staff';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0 duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] dark:bg-slate-900 dark:border dark:border-slate-800 animate-in fade-in-0 zoom-in-95 duration-200 ease-out">

        {/* Header Section */}
        <div className="bg-[#0b1026] text-white p-5 flex justify-between items-start dark:border-b dark:border-slate-800">
          <div className="flex gap-3">
            <div className="mt-1">
              <FileBox size={20} className="text-gray-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-tight">
                Submission — {studentName}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Review and manage {personLabel} file submissions
              </p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Section */}
        <div className="p-6 overflow-y-auto flex-1 dark:bg-slate-900">

          {/* Status & Date */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 border border-yellow-200 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg text-sm font-medium dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300">
              <Clock size={16} /> Awaiting Review
            </div>
            <div className="text-sm text-gray-500 dark:text-slate-400">
              Last updated: {lastUpdated}
            </div>
          </div>

          {/* Files List */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3 dark:text-slate-300">
              Submitted Files ({files.length})
            </h3>
            <div className="flex flex-col gap-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="group flex items-center gap-4 p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors dark:border-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800/80"
                >
                  <div className={`p-2 rounded-lg ${file.type === 'pdf' ? 'bg-red-100 text-red-500 dark:bg-rose-950/60 dark:text-rose-400' : 'bg-blue-100 text-blue-500 dark:bg-sky-950/60 dark:text-sky-400'}`}>
                    {file.type === 'pdf' ? <FileText size={20} /> : <ImageIcon size={20} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate dark:text-slate-100">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 dark:text-slate-400">
                      {file.size !== 'N/A' && `${file.size} · `}Uploaded {file.uploadDate}
                    </p>
                  </div>

                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 dark:bg-slate-700 dark:text-sky-300 dark:hover:bg-slate-600"
                    title="Preview File"
                  >
                    <ExternalLink size={16} />
                    <span className="hidden sm:inline">Preview</span>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Comment / Feedback */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2 dark:text-slate-300">
              <MessageSquare size={16} className="text-gray-400 dark:text-slate-400" />
              Comment / Feedback
            </label>
            <textarea
              value={comment}
              onChange={(e) => handleCommentChange(e.target.value)}
              placeholder="Add your review comments here..."
              disabled={isSubmitting}
              className={`w-full h-24 p-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none disabled:bg-gray-100 disabled:opacity-70 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-amber-400/50 ${
                commentError ? 'border-red-300 bg-red-50/30 dark:border-rose-900/80 dark:bg-rose-950/20' : 'border-gray-200'
              }`}
            />
            {commentError && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-rose-400">
                <AlertTriangle size={12} />
                {commentError}
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions - Default View */}
        {!showRejectConfirm ? (
          <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50 dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={handleRejectClick}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
              Reject & Request Resubmission
            </button>
            <button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-xl transition-colors shadow-sm disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Approve
            </button>
          </div>
        ) : (
          /* Footer Actions - Rejection Confirmation View */
          <div className="p-4 border-t border-red-200 bg-red-50/60 dark:border-rose-900/60 dark:bg-rose-950/40">
            <div className="flex items-start gap-3 mb-3">
              <div className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-100 dark:bg-rose-900/60">
                <AlertTriangle size={14} className="text-red-600 dark:text-rose-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-rose-200">
                  Reject this submission?
                </p>
                <p className="text-xs text-red-600/80 dark:text-rose-300/80 mt-0.5 leading-relaxed">
                  The {personLabel} will be notified and required to re-submit their files. Their current submission will be cleared.
                </p>
              </div>
            </div>

            {/* Preview of the feedback the student will see */}
            {comment.trim() && (
              <div className="mb-3 rounded-xl bg-white border border-red-100 p-3 dark:bg-slate-900 dark:border-rose-900/50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Feedback sent to {personLabel}
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed line-clamp-3">
                  {comment}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRejectConfirm(false)}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 dark:bg-rose-600 dark:hover:bg-rose-700"
              >
                {isSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RotateCcw size={14} />
                )}
                {isSubmitting ? 'Processing...' : 'Confirm & Request Resubmission'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
