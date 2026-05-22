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
        // Changed to a white background with a subtle border and shadow to match the light theme
        // Maintained the STI amber accent on the top border
        <div className="mx-auto mt-6 w-full max-w-6xl rounded-xl bg-white border mb-8 border-slate-200 border-t-4 border-t-amber-500 shadow-sm">
            <div className="flex flex-col p-6 lg:p-8">

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-center gap-5">
                        {/* Avatar: Adjusted rings/shadows for light background */}
                        <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full bg-[#ffb900] text-2xl font-bold tracking-wide text-amber-950 ring-[3px] ring-white shadow-sm">
                            {getFirstInitial(user_name)}
                        </div>

                        {/* Identity Details */}
                        <div className="flex flex-col gap-1.5">
                            {/* Text colors swapped to dark slate for readability */}
                            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                                {user_name}
                            </h1>

                            {/* Meta Info */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-slate-500">
                                <span className="font-medium text-slate-700">Student ID: {user_id}</span>

                                <span className="hidden text-slate-300 sm:inline">•</span>

                                <div className="flex items-center gap-1.5">
                                    <Mail size={14} className="text-slate-400" />
                                    <span>{user_email}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Status Badge: Lightened the backgrounds and adjusted text colors */}
                    {isCleared ? (
                        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-1.5 text-sm font-bold text-green-700 border border-green-200">
                            <CheckCircle2 size={16} className="text-green-600" />
                            <span>Cleared</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700 border border-amber-200">
                            <Clock size={16} className="text-[#ffb900]" />
                            <span>In Progress</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
