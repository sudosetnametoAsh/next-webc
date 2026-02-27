"use client";
import { useFetchRecords } from "@/hooks/student/fetch-student-data";
import Header from "./header";
import StatCard from "./stat-card";
import ClearanceItem from "./clearance-item";

export default function StudentInterface() {
  const { data, isLoading, error } = useFetchRecords();
  const { userData, students } = data || {};

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  if (!students || !userData) return;

  const initial = userData.name[0];
  const name = userData.name;
  const email = userData.email;
  const id = userData.id;

  const calculateCardValues = students.reduce(
    (accumulator, current) => {
      const status = current.status;
      const taskCount = current.assigned_tasks.filter(
        (item) => item.status === "Pending" || item.status === "Flagged",
      ).length;

      current.assigned_tasks.forEach((task) => {
        if (task.dropbox === "pending" || task.dropbox === "NULL")
          accumulator.Task++;
      });

      accumulator[status]++;
      // accumulator.Task += taskCount;

      return accumulator;
    },
    { Signed: 0, Pending: 0, Task: 0 },
  );

  const departmentCount = students.length;
  const pending = calculateCardValues.Pending;
  const signed = calculateCardValues.Signed;
  const taskCount = calculateCardValues.Task;

  const dummyDesc = "Send an X-Ray copy back-to-bak 1/4, A4";

  return (
    <section className="flex min-h-dvh w-screen flex-col gap-5 bg-[#F6F8FB]">
      <Header initial={initial} name={name} email={email} />

      <StatCard
        departmentCount={departmentCount}
        signed={signed}
        pending={pending}
        taskCount={taskCount}
      />

      <ClearanceItem students={students} dummyDesc={dummyDesc} id={id} />
    </section>
  );
}
