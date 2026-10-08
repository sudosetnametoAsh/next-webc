import { getSummaryPromise } from "@/modules/clearance/application/repository/dashboard-repository";
import { ShieldCheck } from "lucide-react";

export default function ProgressCard({ summary }: { summary: getSummaryPromise }) {
  const percentage = summary.department_count > 0
    ? +((summary.cleared_department / summary.department_count) * 100).toFixed()
    : 0;

  const remainingDepts = summary.department_count - summary.cleared_department;
  const isCompleted = summary.cleared_department === summary.department_count && summary.department_count > 0;

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {/* Swapped yellow-500 to amber-500 for consistent STI branding */}
          <ShieldCheck className="text-amber-500" size={22} />
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Clearance Progress</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Track your overall clearance status across all departments
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {`${summary.cleared_department} of ${summary.department_count} departments cleared`}
          </span>
          <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {`${percentage}%`}
          </span>
        </div>

        {/* Progress bar track updated to a soft slate */}
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            // Removed the glowing shadow effect for a cleaner flat UI
            className={`h-full transition-all duration-500 ${
              isCompleted ? "bg-emerald-500" : "bg-amber-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Message box backgrounds updated for light mode */}
      <div className={`rounded-xl border p-4 ${
          isCompleted
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200"
            : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300"
        }`}
      >
        <p className="text-sm leading-relaxed">
          {isCompleted ? (
            <>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">Congratulations!</span> All
              clearances have been successfully completed. You are officially fully cleared.
            </>
          ) : percentage >= 50 ? (
            <>
              <span className="font-bold text-slate-900 dark:text-slate-100">Good progress!</span> You still
              need clearance from <span className="font-semibold text-amber-600 dark:text-amber-400">{remainingDepts}</span> {remainingDepts === 1 ? 'department' : 'departments'}. Check your incomplete tasks and submit requirements.
            </>
          ) : (
            <>
              <span className="font-bold text-slate-900 dark:text-slate-100">Getting Started!</span> You have
              clearance pending for <span className="font-semibold text-amber-600 dark:text-amber-400">{remainingDepts}</span> departments. Please review the missing criteria to begin tracking your tasks.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
