import DashBoardRealtimeProvider from "@/components/clearance/dashboard-realtime-provider";
import OfficeHours from "@/components/clearance/office-hours/office-hours";
import Overview from "@/components/clearance/overview/overview";
import ProfileCard from "@/components/clearance/profile-card";
import TasksPage from "@/components/clearance/tasks/tasks-page";

import { makeGetClearanceRecords } from "@/composition/clearance/make-get-clearance-records";
import { makeGetDepartmentDetailsServer } from "@/composition/clearance/make-get-department-details-server";
import { makeGetOfficeHours } from "@/composition/clearance/make-get-office-hours";
import { makeGetSummary } from "@/composition/clearance/make-get-summary";
import { getSession } from "@/lib/auth/get-session";
import { Clock, Send, ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";

export default async function Clearance({
  searchParams,
}: {
  searchParams: { tab: string };
}) {
  const { user_id } = await getSession();
  const getClearanceRecords = await makeGetClearanceRecords();
  const getSummary = await makeGetSummary();
  const getDepartmentDetailsServer = await makeGetDepartmentDetailsServer();
  const getOfficeHours = await makeGetOfficeHours();

  const [summary, records, tasks, departments] = await Promise.all([
    getSummary.execute(user_id),
    getClearanceRecords.execute(user_id),
    getDepartmentDetailsServer.execute(user_id),
    getOfficeHours.execute(user_id),
  ]);

  const params = await searchParams;
  const activeTab = params.tab || "overview";

  if (!summary || summary.department_count === 0 || records.length === 0) {
    return (
      // Updated wrapper to take full width and height of the parent container
      <div className="flex h-full min-h-[80vh] w-full flex-col items-center justify-center gap-6 p-8 text-center">
        {/* Playful Icon Container */}
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-blue-500 shadow-sm ring-8 ring-blue-50/50">
          <Sparkles className="h-10 w-10" />
        </div>

        {/* Friendly Copy */}
        <div className="max-w-md space-y-3">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            No active clearance right now!
          </h2>
          <p className="text-[15px] leading-relaxed text-slate-500">
            It looks like you don't have any clearance requirements assigned to
            you at the moment. Take a breather, or reach out to your
            administrator if you think this is a mix-up.
          </p>
        </div>
      </div>
    );
  }

  const activeClass =
    "bg-white text-[#0A1128] font-bold shadow-sm ring-1 ring-slate-200";
  const inactiveClass =
    "text-slate-500 font-medium hover:text-slate-800 hover:bg-slate-200/50 transition-colors";
  const baseTabClass =
    "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm transition-all";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6">
      <ProfileCard summary={summary} />

      {/* TAB NAVIGATION */}
      <nav className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1.5">
        <Link
          href="?tab=overview"
          className={`${baseTabClass} ${activeTab === "overview" ? activeClass : inactiveClass}`}
        >
          <ShieldCheck
            size={18}
            className={activeTab === "overview" ? "text-black" : ""}
          />
          Overview
        </Link>

        <Link
          href="?tab=tasks"
          className={`${baseTabClass} ${activeTab === "tasks" ? activeClass : inactiveClass}`}
        >
          <Send
            size={18}
            className={activeTab === "tasks" ? "text-black" : ""}
          />
          Tasks
        </Link>

        <Link
          href="?tab=office-hours"
          className={`${baseTabClass} ${activeTab === "office-hours" ? activeClass : inactiveClass}`}
        >
          <Clock
            size={18}
            className={activeTab === "office-hours" ? "text-black" : ""}
          />
          Office Hours
        </Link>
      </nav>

      {/* CONDITIONALLY RENDER COMPONENTS */}
      <div className="flex justify-center">
        <DashBoardRealtimeProvider>
          {activeTab === "overview" && (
            <Overview records={records} summary={summary} />
          )}
          {activeTab === "tasks" && <TasksPage task={tasks} />}
          {activeTab === "office-hours" && (
            <OfficeHours departments={departments} />
          )}
        </DashBoardRealtimeProvider>
      </div>
    </div>
  );
}
