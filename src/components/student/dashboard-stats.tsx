// components/student/dashboard-stats.tsx
import React from 'react';

interface Props {
  records: any[]; // Replace 'any' with your actual Student/Record interface
}

export default function DashboardStats({ records }: Props) {
  // 1. Calculate the numbers dynamically
  const clearedCount = records.filter(r => r.status === 'Complete').length;
  const pendingCount = records.filter(r => r.status === 'Pending').length;
  
  // Assuming total tasks is the sum of tasks in all records, 
  // or just the number of faculties (records)
  const totalTasks = records.reduce((acc, curr) => {
    return acc + (curr.student_tasks_status?.length || 0);
  }, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Green Box */}
      <div className="bg-green-50 border border-green-200 p-6 rounded-xl text-center">
        <h2 className="text-3xl font-bold text-green-600">{clearedCount}</h2>
        <p className="text-sm font-semibold text-green-700">Faculties Cleared!</p>
      </div>

      {/* Orange Box */}
      <div className="bg-orange-50 border border-orange-200 p-6 rounded-xl text-center">
        <h2 className="text-3xl font-bold text-orange-500">{pendingCount}</h2>
        <p className="text-sm font-semibold text-orange-700">Pending Faculties</p>
      </div>

      {/* Blue Box */}
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl text-center">
        <h2 className="text-3xl font-bold text-blue-500">{totalTasks}</h2>
        <p className="text-sm font-semibold text-blue-700">Total Tasks</p>
      </div>
    </div>
  );
}