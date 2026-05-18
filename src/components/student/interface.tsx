"use client";
import { useFetchRecords } from "@/hooks/student/fetch-student-data";
import Header from "./header";
import StatCard from "./stat-card";
import ClearanceItem from "./clearance-item";

export default function StudentInterface() {
  const { data, isLoading, error } = useFetchRecords();
  const { userData, students } = data || {};

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (error) return <div className="flex h-screen items-center justify-center text-red-500">Error: {error.message}</div>;

  if (!students || !userData) return null;

  const initial = userData.name[0];
  const name = userData.name;
  const email = userData.email;
  const id = userData.id;

  const calculateCardValues = students.reduce(
    (accumulator, current) => {
      const status = current.status;
      current.clearance_tasks.forEach((task) => {
        if (task.dropbox === "pending" || task.dropbox === "NULL")
          accumulator.Task++;
      });
      accumulator[status]++;
      return accumulator;
    },
    { Signed: 0, Pending: 0, Task: 0 },
  );

  const departmentCount = students.length;
  const pending = calculateCardValues.Pending;
  const signed = calculateCardValues.Signed;
  const taskCount = calculateCardValues.Task;


  return (
    <section className="flex min-h-screen w-full flex-col bg-[#F8FAFC]">
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 pb-12">
        <Header initial={initial} name={name} email={email} />

        <StatCard
          departmentCount={departmentCount}
          signed={signed}
          pending={pending}
          taskCount={taskCount}
        />

        <div className="mt-8">
          <ClearanceItem students={students} id={id} />
        </div>
      </div>
    </section>
  );
}
