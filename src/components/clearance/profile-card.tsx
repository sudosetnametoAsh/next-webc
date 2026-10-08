import React from "react";
import { Mail, Clock, CheckCircle2 } from "lucide-react";
import { getSession } from "@/lib/auth/get-session";
import { getSummaryPromise } from "@/modules/clearance/application/repository/dashboard-repository";

export default async function ProfileHeader({
    summary
}: {
    summary: getSummaryPromise
}) {
    const { user_id, user_email, user_name } = await getSession();

    const getFirstInitial = (fullName: string) => {
        if (!fullName) return "S";
        return fullName.trim().charAt(0).toUpperCase();
    };

    const isCleared = summary.remaining_department === 0 && summary.department_count > 0;

    return (
        <div className="mx-auto mt-6 w-full max-w-6xl rounded-2xl bg-[#0a1128] mb-8 border border-slate-800 shadow-md">
            <div className="flex flex-col p-6 lg:p-8">

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-center gap-5">
                        {/* Avatar ring adjusted to match dark background */}
                        <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full bg-[#ffb900] text-2xl font-bold tracking-wide text-amber-950 ring-[3px] ring-slate-900 shadow-sm">
                            {getFirstInitial(user_name)}
                        </div>

                        {/* Identity Details */}
                        <div className="flex flex-col gap-1.5">
                            <h1 className="text-xl font-bold text-white sm:text-2xl">
                                {user_name}
                            </h1>

                            {/* Meta Info */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-slate-400">
                                <span className="font-medium text-slate-300">Student ID: {user_id}</span>

                                <span className="hidden text-slate-600 sm:inline">•</span>

                                <div className="flex items-center gap-1.5">
                                    <Mail size={14} className="text-slate-500" />
                                    <span>{user_email}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Status Badge updated for dark mode */}
                    {isCleared ? (
                        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-1.5 text-sm font-bold text-green-400 border border-green-500/20">
                            <CheckCircle2 size={16} className="text-green-500" />
                            <span>Cleared</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-sm font-bold text-[#ffb900] border border-amber-500/20">
                            <Clock size={16} className="text-[#ffb900]" />
                            <span>In Progress</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
