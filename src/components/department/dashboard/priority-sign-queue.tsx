"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, CheckCircle2, User, Loader2, Sparkles } from "lucide-react";

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
    refetchInterval: 10000, // Sync every 10s
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
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="h-6 w-48 bg-slate-100 rounded animate-pulse" />
          <div className="h-8 w-28 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="mt-4 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (priorityStudents.length === 0) {
    return null; // Clean: hides widget when no students are in the priority queue
  }

  const isSigningAny = signMutation.isPending;

  return (
    <div className="overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/70 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-[#0A1128] shadow-sm">
            <Zap className="h-4 w-4 fill-current" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Priority Sign-Off Queue
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                {priorityStudents.length} Ready
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Students who completed all assigned tasks early and are eligible for instant approval
            </p>
          </div>
        </div>

        <button
          onClick={handleSignAll}
          disabled={isSigningAny}
          className="flex items-center gap-2 rounded-lg bg-[#0A1128] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#162145] active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {isSigningAny ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5 text-amber-400 fill-current" />
          )}
          Sign All Ready ({priorityStudents.length})
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-amber-100/60 p-2">
        {priorityStudents.map((student) => {
          const isThisSigning = signingIds.includes(student.clearance_id);

          return (
            <div
              key={student.clearance_id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg p-3 transition hover:bg-amber-100/40"
            >
              {/* Left Student Info */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-amber-400 shrink-0 shadow-sm">
                  {student.student_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">
                      {student.student_name}
                    </p>
                    <span className="text-xs text-slate-400 font-mono">
                      #{student.student_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {student.course_name} {student.section_label ? `• ${student.section_label}` : ""}
                  </p>
                </div>
              </div>

              {/* Middle Badge & Action */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>All {student.completed_tasks_count} tasks completed</span>
                </div>

                <button
                  onClick={() => handleSignSingle(student.clearance_id)}
                  disabled={isThisSigning || isSigningAny}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-[#0A1128] shadow-xs transition hover:bg-amber-300 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isThisSigning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5 fill-current" />
                  )}
                  Quick Sign
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
