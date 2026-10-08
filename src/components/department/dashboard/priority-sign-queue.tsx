"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, CheckCircle2, Loader2, UserCheck } from "lucide-react";

interface PriorityStudent {
  clearance_id: string;
  student_id: string;
  student_name: string;
  course_name: string;
  section_label: string;
  completed_tasks_count: number;
  latest_activity: string | null;
}

export default function PrioritySignQueue() {
  const queryClient = useQueryClient();
  const [signingIds, setSigningIds] = useState<string[]>([]);

  // 1. Fetch priority candidates
  const { data: priorityStudents = [], isLoading } = useQuery<PriorityStudent[]>({
    queryKey: ["priority-queue"],
    queryFn: async () => {
      const res = await fetch("/api/department/clients/quick-sign");
      if (!res.ok) throw new Error("Failed to load priority queue");
      const json = await res.json();
      return json.data || [];
    },
    refetchInterval: 10000,
  });

  // 2. Sign Mutation
  const signMutation = useMutation({
    mutationFn: async (clearanceIds: string[]) => {
      const res = await fetch("/api/department/clients/quick-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearance_ids: clearanceIds }),
      });
      if (!res.ok) throw new Error("Failed to sign clearance");
      return res.json();
    },
    onMutate: async (clearanceIds) => {
      setSigningIds((prev) => [...prev, ...clearanceIds]);
    },
    onSettled: () => {
      setSigningIds([]);
      queryClient.invalidateQueries({ queryKey: ["priority-queue"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const handleSignSingle = (clearanceId: string) => {
    signMutation.mutate([clearanceId]);
  };

  const handleSignAll = () => {
    const allIds = priorityStudents.map((s) => s.clearance_id);
    if (allIds.length > 0) {
      signMutation.mutate(allIds);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="h-6 w-48 bg-slate-100 rounded animate-pulse dark:bg-slate-800" />
          <div className="h-8 w-28 bg-slate-100 rounded-lg animate-pulse dark:bg-slate-800" />
        </div>
        <div className="mt-4 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse dark:bg-slate-800/60" />
          ))}
        </div>
      </div>
    );
  }

  if (priorityStudents.length === 0) {
    return null; // Gracefully hidden when queue is clear
  }

  const isSigningAny = signMutation.isPending;

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200/90 bg-white shadow-xs dark:bg-slate-900/90 dark:border-amber-900/60 dark:shadow-2xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-100/80 bg-amber-50/40 px-6 py-4 dark:bg-amber-950/30 dark:border-amber-900/40">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-amber-950 font-bold shadow-2xs">
            <Zap className="h-4 w-4 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Priority Sign-Off Desk
              </h2>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 tabular-nums border border-amber-200 dark:bg-amber-900/40 dark:border-amber-800/60 dark:text-amber-300">
                {priorityStudents.length} Ready for Approval
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Students who satisfied all requirement uploads and prerequisites.
            </p>
          </div>
        </div>

        <button
          onClick={handleSignAll}
          disabled={isSigningAny}
          className="flex items-center gap-2 rounded-xl bg-[#0B192C] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-[background-color,transform] duration-150 ease-out hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 cursor-pointer dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950"
        >
          {isSigningAny ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserCheck className="h-3.5 w-3.5 text-amber-400 dark:text-slate-950" />
          )}
          <span>Sign All Eligible ({priorityStudents.length})</span>
        </button>
      </div>

      {/* Student List */}
      <div className="flex flex-col gap-2 p-4 divide-y divide-slate-100 dark:divide-slate-800">
        {priorityStudents.map((student) => {
          const isThisSigning = signingIds.includes(student.clearance_id);

          return (
            <div
              key={student.clearance_id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 first:pt-0 dark:hover:bg-slate-800/50 rounded-xl p-2 sm:p-2.5 transition-colors"
            >
              {/* Left Student Info */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-bold text-xs shrink-0 dark:bg-amber-950/40 dark:border dark:border-amber-800/60 dark:text-amber-300">
                  {student.student_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {student.student_name}
                    </p>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      #{student.student_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {student.course_name}
                    {student.section_label ? ` · ${student.section_label}` : ""}
                  </p>
                </div>
              </div>

              {/* Right Status Badge & Quick Sign Action */}
              <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>All {student.completed_tasks_count} tasks verified</span>
                </div>

                <button
                  onClick={() => handleSignSingle(student.clearance_id)}
                  disabled={isThisSigning || isSigningAny}
                  className="flex items-center gap-1.5 rounded-lg bg-[#0B192C] px-3.5 py-1.5 text-xs font-bold text-amber-400 shadow-2xs transition-[background-color,color,transform] duration-150 ease-out hover:bg-slate-800 hover:text-amber-300 active:scale-[0.97] disabled:opacity-50 cursor-pointer dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950"
                >
                  {isThisSigning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5 dark:text-slate-950" />
                  )}
                  <span>Sign Clearance</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
