type StatCard = {
  departmentCount: number;
  signed: number;
  pending: number;
  taskCount: number;
};

export default function StatCard({
  departmentCount,
  signed,
  pending,
  taskCount,
}: StatCard) {
  return (
    <section id="stat-card" className="mt-8 w-full">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="flex h-32 flex-col justify-center gap-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900/90 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-400">Department(s)</span>
          <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">{departmentCount}</span>
        </div>

        <div className="flex h-32 flex-col justify-center gap-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900/90 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-400">Completed</span>
          <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">{signed}</span>
        </div>

        <div className="flex h-32 flex-col justify-center gap-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900/90 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-400">Pending</span>
          <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">{pending}</span>
        </div>

        <div className="flex h-32 flex-col justify-center gap-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900/90 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-400">Task(s)</span>
          <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">{taskCount}</span>
        </div>

      </div>
    </section>
  );
}
