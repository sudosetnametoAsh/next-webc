"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  GitFork, 
  Layers, 
  ArrowRight, 
  Check, 
  Loader2, 
  Building2, 
  Info,
  ShieldCheck
} from "lucide-react";

interface Department {
  dept_id: number;
  dept_name: string;
  signing_order?: number;
}

const TIER_OPTIONS = [
  { value: 1, label: "Tier 1: Initial Prerequisite (Signs First)", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: 2, label: "Tier 2: Mid-Clearance (Signs in Parallel)", color: "bg-slate-50 text-slate-700 border-slate-200" },
  { value: 3, label: "Tier 3: Final Sign-Off (Signs Last)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

export default function HierarchyManager() {
  const queryClient = useQueryClient();
  const [localOrders, setLocalOrders] = useState<Record<number, number>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Fetch departments
  const { data: departments = [], isLoading } = useQuery<Department[]>({
    queryKey: ["admin-departments-hierarchy"],
    queryFn: async () => {
      const res = await fetch("/api/admin/departments");
      if (!res.ok) throw new Error("Failed to load departments");
      const json = await res.json();
      return json.data || [];
    },
  });

  // Sync initial state
  useEffect(() => {
    if (departments.length > 0) {
      const initial: Record<number, number> = {};
      departments.forEach((d) => {
        const defaultOrder = d.dept_name.toLowerCase().includes("cashier")
          ? 1
          : d.dept_name.toLowerCase().includes("registrar")
          ? 3
          : 2;
        initial[d.dept_id] = d.signing_order ?? defaultOrder;
      });
      setLocalOrders(initial);
    }
  }, [departments]);

  // Mutation to save hierarchy
  const saveMutation = useMutation({
    mutationFn: async (payload: { dept_id: number; signing_order: number }[]) => {
      const res = await fetch("/api/admin/departments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save hierarchy");
      return res.json();
    },
    onSuccess: () => {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      queryClient.invalidateQueries({ queryKey: ["admin-departments-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });

  const handleOrderChange = (deptId: number, order: number) => {
    setLocalOrders((prev) => ({ ...prev, [deptId]: order }));
  };

  const handleSave = () => {
    const payload = Object.entries(localOrders).map(([dept_id, signing_order]) => ({
      dept_id: Number(dept_id),
      signing_order,
    }));
    saveMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-slate-200 bg-white p-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // Group departments by assigned tier
  const tier1 = departments.filter((d) => (localOrders[d.dept_id] ?? 2) === 1);
  const tier2 = departments.filter((d) => (localOrders[d.dept_id] ?? 2) === 2);
  const tier3 = departments.filter((d) => (localOrders[d.dept_id] ?? 2) >= 3);

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0A1128] text-white shadow-sm">
              <GitFork className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Clearance Signing Hierarchy</h2>
              <p className="text-xs text-slate-500">
                Configure the prerequisite signing sequence. Lower tiers must be fully signed before higher tiers unlock.
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-[#0A1128] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#162145] active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : savedSuccess ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Layers className="h-4 w-4 text-amber-400" />
            )}
            {savedSuccess ? "Hierarchy Saved!" : "Save Signing Hierarchy"}
          </button>
        </div>

        {/* Visual Workflow Preview */}
        <div className="mt-6 rounded-xl bg-slate-50 p-4 border border-slate-100">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Active Sequence Flow
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {/* Step 1 */}
            <div className="flex-1 min-w-[200px] rounded-lg border border-blue-200 bg-blue-50/70 p-3">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                Step 1 · Prerequisite
              </span>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {tier1.length > 0 ? tier1.map((d) => d.dept_name).join(", ") : "None assigned"}
              </p>
            </div>

            <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />

            {/* Step 2 */}
            <div className="flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-white p-3">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Step 2 · Parallel Departments
              </span>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {tier2.length > 0 ? tier2.map((d) => d.dept_name).join(", ") : "None assigned"}
              </p>
            </div>

            <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />

            {/* Step 3 */}
            <div className="flex-1 min-w-[200px] rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Step 3 · Final Sign-Off
              </span>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {tier3.length > 0 ? tier3.map((d) => d.dept_name).join(", ") : "None assigned"}
              </p>
            </div>
          </div>
        </div>

        {/* Department Config List */}
        <div className="mt-6 divide-y divide-slate-100">
          {departments.map((dept) => {
            const currentTier = localOrders[dept.dept_id] ?? 2;

            return (
              <div
                key={dept.dept_id}
                className="flex flex-wrap items-center justify-between gap-4 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{dept.dept_name}</p>
                    <p className="text-xs text-slate-400">Department ID: #{dept.dept_id}</p>
                  </div>
                </div>

                {/* Tier Selector Dropdown */}
                <div className="flex items-center gap-3">
                  <select
                    value={currentTier}
                    onChange={(e) => handleOrderChange(dept.dept_id, Number(e.target.value))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition focus:border-[#0A1128] focus:outline-none cursor-pointer"
                  >
                    {TIER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
