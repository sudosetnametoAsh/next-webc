

export default function DashboardStats({ records }: { records: any[] }) {
    
    const clearedCount = records.filter(r => 
        r.status === 'Complete' || r.status === 'Signed'
    ).length;

    
    const pendingCount = records.length - clearedCount;

   
    const pendingTasksCount = records.reduce((total, record) => {
        
        if (record.status === 'Complete' || record.status === 'Signed') {
            return total;
        }

        const tasks = record.student_tasks_status || [];
        
        
        const activeTasks = tasks.filter((t: any) => {
            const s = t.status?.toLowerCase();
            
            return s === 'pending' || (s !== 'completed' && s !== 'done' && s !== 'signed');
        }).length;

        return total + activeTasks;
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
                <h2 className="text-3xl font-bold text-blue-500">{pendingTasksCount}</h2>
                <p className="text-sm font-semibold text-blue-700">Pending Tasks</p>
            </div>
        </div>
    );
}