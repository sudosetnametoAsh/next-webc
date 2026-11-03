"use client";

import { useDepartmentDashboard } from "@/hooks/department/use-department-dashboard";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  CourseVelocity,
  getRecentSubmissionsPromise,
  getStatCardValuePromise,
  ReadyToSignClient,
} from "@/modules/staff/application/repository/dashboard-repository";
import DepartmentGreeting from "./department-greeting";
import CourseVelocityCard from "./course-velocity-card";
import RecentSubmissionsCard from "./recent-submissions-card";
import AiVerificationConfigModal from "./ai-verification-config-modal";

export default function DashboardClient({
  user_name,
  department,
  stats: initialStats,
  recentSubmissions: initialSubmissions = [],
  readyToSignClients = [],
  courseVelocity: initialVelocity = [],
}: {
  user_name: string;
  department?: string;
  stats: getStatCardValuePromise;
  recentSubmissions: getRecentSubmissionsPromise[];
  readyToSignClients?: ReadyToSignClient[];
  courseVelocity: CourseVelocity[];
}) {
  const { data } = useDepartmentDashboard({
    stats: initialStats, recentSubmissions: initialSubmissions,
    readyToSignClients, courseVelocity: initialVelocity,
  });
  const stats = data?.stats ?? initialStats;
  const recentSubmissions = data?.recentSubmissions ?? initialSubmissions;
  const courseVelocity = data?.courseVelocity ?? initialVelocity;
  const [aiModalOpen, setAiModalOpen] = useState(false);

  return (
    <section className="space-y-6">
      {/* ── 1. Greeting Banner with Macro Metric Cards ── */}
      <DepartmentGreeting
        userName={user_name}
        department={department}
        stats={stats}
      />

      {/* ── 2. Balanced 2-Column Dashboard Grid (Course Progress Left, Recent Submissions Right) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start w-full">
        {/* Left Column: Course Progress (Top 5 Lowest Signing Rate) */}
        <div className="w-full min-w-0">
          <CourseVelocityCard courses={courseVelocity} />
        </div>

        {/* Right Column: Recent Submissions (5 Recent Submissions) */}
        <div className="w-full min-w-0">
          <RecentSubmissionsCard submissions={recentSubmissions} />
        </div>
      </div>

      {/* ── 3. Floating Action Button (FAB) for AI Verification Config ── */}
      <button
        type="button"
        onClick={() => setAiModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/40 bg-[#0a101f]/95 text-amber-400 shadow-2xl shadow-amber-500/20 hover:border-amber-400 hover:bg-[#0f172a] hover:text-amber-300 hover:scale-105 active:scale-95 transition-ui duration-200 cursor-pointer backdrop-blur-md"
        aria-label="AI Verification Configuration"
        title="AI Verification Configuration"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      {/* ── 4. AI Verification Config Modal ── */}
      <AiVerificationConfigModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
      />
    </section>
  );
}
