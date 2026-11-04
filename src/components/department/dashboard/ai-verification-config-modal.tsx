"use client";

import { toast } from "sonner";
import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  Sliders,
  Check,
  Loader2,
  Lock,
} from "lucide-react";

interface AiVerificationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export type VerificationMode = "two_factor" | "autonomous" | "manual";

export default function AiVerificationConfigModal({
  isOpen,
  onClose,
  onConfigSaved,
}: AiVerificationConfigModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<VerificationMode>("two_factor");
  const [threshold, setThreshold] = useState<number>(85);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadSettings() {
      setLoading(true);
      try {
        const res = await fetch("/api/department/settings/ai-verification");
        if (!res.ok) throw new Error("Failed to fetch settings");
        const data = await res.json();
        if (isMounted && data.configuration) {
          setMode(data.configuration.aiVerificationMode || "two_factor");
          setThreshold(data.configuration.aiConfidenceThreshold ?? 85);
        }
      } catch (err) {
        console.error("Error loading AI settings:", err);
        if (isMounted) toast.error("Could not load AI settings. Close and reopen this dialog to try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/department/settings/ai-verification", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiVerificationMode: mode,
          aiConfidenceThreshold: threshold,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save configuration");
      }

      toast.success("AI verification settings saved");
      if (onConfigSaved) onConfigSaved();
      onClose();
    } catch (err: any) {
      console.error("Error saving settings:", err);
      toast.error(err.message || "Failed to update configuration");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#040711]/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0a101f] shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#070c18] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-sm shadow-amber-500/10">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                AI Verification Protocol
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure firsthand AI document forensics and two-factor clearance sign-off
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400 mb-3" />
              <p className="text-xs font-medium">Loading your configuration...</p>
            </div>
          ) : (
            <>
              {/* 1. Mode Selection */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-3">
                  Verification Mode
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {/* Mode A: Two-Factor Verification */}
                  <div
                    onClick={() => setMode("two_factor")}
                    className={`cursor-pointer rounded-xl border p-4 transition-ui relative ${
                      mode === "two_factor"
                        ? "border-amber-500/80 bg-amber-500/10 ring-1 ring-amber-500/30"
                        : "border-slate-800 bg-[#070c18]/70 hover:border-slate-700 hover:bg-[#070c18]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                            mode === "two_factor"
                              ? "border-amber-500/40 bg-amber-500/20 text-amber-400"
                              : "border-slate-800 bg-slate-900 text-slate-400"
                          }`}
                        >
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white">
                              Two-Factor Verification (2FV)
                            </h3>
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                              Default / Recommended
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            AI conducts firsthand forensic inspection & extracts student ID/receipt data.
                            Staff provides final 1-click authorization before clearance is cleared.
                          </p>
                        </div>
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          mode === "two_factor"
                            ? "border-amber-500 bg-amber-500 text-[#070c18]"
                            : "border-slate-700 bg-slate-900"
                        }`}
                      >
                        {mode === "two_factor" && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                  </div>

                  {/* Mode B: Autonomous Auto-Approve */}
                  <div
                    onClick={() => setMode("autonomous")}
                    className={`cursor-pointer rounded-xl border p-4 transition-ui relative ${
                      mode === "autonomous"
                        ? "border-amber-500/80 bg-amber-500/10 ring-1 ring-amber-500/30"
                        : "border-slate-800 bg-[#070c18]/70 hover:border-slate-700 hover:bg-[#070c18]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                            mode === "autonomous"
                              ? "border-amber-500/40 bg-amber-500/20 text-amber-400"
                              : "border-slate-800 bg-slate-900 text-slate-400"
                          }`}
                        >
                          <Zap className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white">
                              Autonomous Auto-Approve
                            </h3>
                            <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                              Fully Automated
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            AI directly clears valid submissions when confidence meets or exceeds threshold.
                            Only flagged anomalies or mismatched IDs are routed to staff.
                          </p>
                        </div>
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          mode === "autonomous"
                            ? "border-amber-500 bg-amber-500 text-[#070c18]"
                            : "border-slate-700 bg-slate-900"
                        }`}
                      >
                        {mode === "autonomous" && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                  </div>

                  {/* Mode C: Strict Manual */}
                  <div
                    onClick={() => setMode("manual")}
                    className={`cursor-pointer rounded-xl border p-4 transition-ui relative ${
                      mode === "manual"
                        ? "border-amber-500/80 bg-amber-500/10 ring-1 ring-amber-500/30"
                        : "border-slate-800 bg-[#070c18]/70 hover:border-slate-700 hover:bg-[#070c18]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                            mode === "manual"
                              ? "border-amber-500/40 bg-amber-500/20 text-amber-400"
                              : "border-slate-800 bg-slate-900 text-slate-400"
                          }`}
                        >
                          <Lock className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">Strict Manual Review</h3>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            Disables AI vision pre-screening. All student uploads enter the queue
                            as standard pending submissions requiring manual inspection.
                          </p>
                        </div>
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          mode === "manual"
                            ? "border-amber-500 bg-amber-500 text-[#070c18]"
                            : "border-slate-700 bg-slate-900"
                        }`}
                      >
                        {mode === "manual" && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Confidence Threshold Slider (Only active if AI is enabled) */}
              {mode !== "manual" && (
                <div className="rounded-xl border border-slate-800 bg-[#070c18] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-amber-400" />
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        AI Confidence Threshold
                      </label>
                    </div>
                    <span className="font-mono text-sm font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-md">
                      {threshold}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="70"
                    max="95"
                    step="1"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-2 rounded-lg bg-slate-800"
                  />

                  <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                    <span>70% (Lenient)</span>
                    <span className="text-amber-400/90">85% (Optimal Balance)</span>
                    <span>95% (Strict Forensics)</span>
                  </div>
                </div>
              )}

            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800/80 bg-[#070c18] flex gap-3 sm:flex-row flex-col">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors focus:ring-2 focus:ring-slate-600 focus:outline-none cursor-pointer text-center text-xs sm:text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 focus:ring-2 focus:ring-amber-500/50 focus:outline-none shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                <span>Saving Protocol...</span>
              </>
            ) : (
              <>
                {/* <Check className="w-5 h-5 stroke-[2.5]" /> */}
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
