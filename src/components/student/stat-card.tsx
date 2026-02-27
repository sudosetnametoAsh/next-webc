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
    <section id="stat-card" className="flex justify-center">
      <div
        id="stat-card-container"
        className="flex w-[60vw] flex-row justify-center gap-2"
      >
        <div
          id="total-department"
          className="flex h-37.5 w-91 flex-col justify-center gap-2 rounded-md border-2 bg-[#FFFFFF] p-6"
        >
          <span className="text-sm font-medium">Department(s)</span>
          <span className="text-4xl font-bold">{departmentCount}</span>
        </div>

        <div
          id="completed"
          className="flex h-37.5 w-91 flex-col justify-center gap-2 rounded-md border-2 bg-[#FFFFFF] p-6"
        >
          <span className="text-sm font-medium">Completed</span>
          <span className="text-4xl font-bold">{signed}</span>
        </div>

        <div
          id="pendingu"
          className="flex h-37.5 w-91 flex-col justify-center gap-2 rounded-md border-2 bg-[#FFFFFF] p-6"
        >
          <span className="text-sm font-medium">Pending</span>
          <span className="text-4xl font-bold">{pending}</span>
        </div>

        <div
          id="tasks"
          className="flex h-37.5 w-91 flex-col justify-center gap-2 rounded-md border-2 bg-[#FFFFFF] p-6"
        >
          <span className="text-sm font-medium">Task(s)</span>
          <span className="text-4xl font-bold">{taskCount}</span>
        </div>
      </div>
    </section>
  );
}
