import DashBoardRealtimeProvider from "@/components/clearance/dashboard-realtime-provider";
import OfficeHours from "@/components/clearance/office-hours/office-hours";
import Overview from "@/components/clearance/overview/overview";
import ProfileCard from "@/components/clearance/profile-card";
import TasksPage from "@/components/clearance/tasks/tasks-page";

import { makeGetClearanceRecords } from "@/composition/clearance/make-get-clearance-records";
import { makeGetDepartmentDetailsServer } from "@/composition/clearance/make-get-department-details-server";
import { makeGetOfficeHours } from "@/composition/clearance/make-get-office-hours";
import { makeGetSummary } from "@/composition/clearance/make-get-summary";
import { Clock, GraduationCap, Send, ShieldCheck, User } from "lucide-react";
import Link from "next/link";

export default async function Clearance({
  searchParams,
}: {
  searchParams: { tab: string };
}) {
  const getClearanceRecords = await makeGetClearanceRecords();
  const getSummary = await makeGetSummary();
  const getDepartmentDetailsServer = await makeGetDepartmentDetailsServer();
  const getOfficeHours = await makeGetOfficeHours();

  const [summary, records, tasks, departments] = await Promise.all([
    getSummary.execute(),
    getClearanceRecords.execute(),
    getDepartmentDetailsServer.execute(),
    getOfficeHours.execute(),
  ]);
  const params = await searchParams;
  const activeTab = params.tab || "overview";

  const activeClass = "bg-white text-blue-900 font-bold shadow-sm ring-1 ring-slate-200";
  const inactiveClass = "text-slate-500 font-medium hover:text-slate-800 hover:bg-slate-200/50 transition-colors";
  const baseTabClass = "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm transition-all";

  return (
    <main className="min-h-screen bg-gray-50/50 pb-10">
      {/* GLOBAL HEADER */}
      <header className="flex h-[56px] w-full items-center border-b bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#ffb900] text-black">
              <GraduationCap size={20} />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold">STI Clearance System</span>
              <span className="text-[10px] tracking-wider text-gray-500 uppercase">
                Portal
              </span>
            </div>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-gray-50 text-gray-600">
            <User size={20} />
          </div>
        </div>
      </header>


      {/* TAB NAVIGATION */}
      <div className="mx-auto mt-6 w-full max-w-6xl px-4">
        <ProfileCard summary={summary} />
        <nav className="flex items-center gap-1 rounded-xl bg-slate-100 p-1.5 border border-slate-200">
          <Link
            href="?tab=overview"
            className={`${baseTabClass} ${activeTab === "overview" ? activeClass : inactiveClass}`}
          >
            <ShieldCheck size={18} className={activeTab === "overview" ? "text-amber-500" : ""} />
            Overview
          </Link>
          <Link
            href="?tab=tasks"
            className={`${baseTabClass} ${activeTab === "tasks" ? activeClass : inactiveClass}`}
          >
            <Send size={18} className={activeTab === "tasks" ? "text-amber-500" : ""} />
            Tasks
          </Link>
          <Link
            href="?tab=office-hours"
            className={`${baseTabClass} ${activeTab === "office-hours" ? activeClass : inactiveClass}`}
          >
            <Clock size={18} className={activeTab === "office-hours" ? "text-amber-500" : ""} />
            Office Hours
          </Link>
        </nav>

        {/* CONDITIONALLY RENDER COMPONENTS */}
        <div className="mt-6 flex justify-center">
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
    </main>
  );
}
