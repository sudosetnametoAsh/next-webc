import StudentDashboard from "@/components/student/student-table";
export default function StudentsPage() {
  return (
   
    <main className="min-h-screen bg-gray-50 flex justify-center py-12 px-4">
      
      
      <div className="w-full max-w-7xl">
        <StudentDashboard />
      </div>

    </main>
  );
}