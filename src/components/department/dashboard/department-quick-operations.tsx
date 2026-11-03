"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  Calendar,
  Layers,
  BarChart3,
  ArrowUpRight,
  Zap,
  Sparkles,
} from "lucide-react";
import AiVerificationConfigModal from "./ai-verification-config-modal";

interface DepartmentQuickOperationsProps {
  pendingCount?: number;
}

export default function DepartmentQuickOperations({
  pendingCount = 0,
}: DepartmentQuickOperationsProps) {
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const operations = [
    {
      label: "Clients Queue",
      subtitle: "Review & sign off client clearances",
      href: "/department/clients",
      icon: Users,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10 border-amber-500/20",
      badge: pendingCount > 0 ? `${pendingCount} Pending` : undefined,
      badgeColor: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    },
    {
      label: "AI Verification Config",
      subtitle: "Two-factor & auto-approve settings",
      onClick: () => setAiModalOpen(true),
      icon: Sparkles,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
      badge: "2-Factor Active",
      badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    },
    {
      label: "My Calendar",
      subtitle: "Configure office hours & availability",
      href: "/department/calendar",
      icon: Calendar,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10 border-blue-500/20",
      badge: "Office Hours",
      badgeColor: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    },
    {
      label: "Reports & Analytics",
      subtitle: "Clearance audits & throughput metrics",
      href: "/department/reports",
      icon: BarChart3,
      iconColor: "text-purple-400",
      iconBg: "bg-purple-500/10 border-purple-500/20",
    },
  ];

  return (
    <>
      <div className="rounded-2xl border border-portal-border bg-portal-surface shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-portal-border bg-portal-inset px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Operational Hub
              </h2>
              <p className="text-xs text-slate-400">
                Quick shortcuts to core clearance modules
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-ui cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Protocol</span>
          </button>
        </div>

        {/* 2x2 Grid */}
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {operations.map((op) => {
            const Icon = op.icon;
            const content = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border ${op.iconBg} ${op.iconColor} shadow-xs transition-transform group-hover:scale-105`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    {op.badge && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold font-mono ${op.badgeColor}`}
                      >
                        {op.badge}
                      </span>
                    )}
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-600 transition-colors group-hover:text-amber-400">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    {op.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">
                    {op.subtitle}
                  </p>
                </div>
              </>
            );

            if (op.onClick) {
              return (
                <button
                  key={op.label}
                  type="button"
                  onClick={op.onClick}
                  className="group relative flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#070c18]/70 p-4 transition-ui hover:border-slate-700 hover:bg-[#070c18] hover:shadow-md text-left cursor-pointer"
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={op.label}
                href={op.href!}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-800/80 bg-[#070c18]/70 p-4 transition-ui hover:border-slate-700 hover:bg-[#070c18] hover:shadow-md"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>

      {aiModalOpen && (
        <AiVerificationConfigModal
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
        />
      )}
    </>
  );
}
