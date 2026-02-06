import React from 'react';

interface DashboardStatsProps {
    records: any[];
    balance: string;
}

export default function DashboardStats({ records, balance }: DashboardStatsProps) {
    
    // Logic: Count how many are cleared vs pending
    const clearedCount = records.filter(r => r.status === 'Complete' || r.status === 'Signed').length;
    const pendingCount = records.length - clearedCount;

    // Logic: Count total sub-tasks inside pending requirements
    const pendingTasksCount = records.reduce((total, record) => {
        if (record.status === 'Complete' || record.status === 'Signed') return total;
        const tasks = record.student_tasks_status || [];
        // Only count active tasks
        const activeTasks = tasks.filter((t: any) => {
            const s = t.status?.toLowerCase();
            return s === 'pending' || (s !== 'completed' && s !== 'done' && s !== 'signed');
        }).length;
        return total + activeTasks;
    }, 0);

    // Reusable Small Card Component
    const StatCard = ({ value, label, bgClass, textClass }: any) => (
        <div className={`${bgClass} p-4 rounded-xl flex flex-col items-center justify-center text-center h-32 border border-transparent hover:border-black/5 transition-all shadow-sm`}>
            <span className={`text-3xl font-bold ${textClass} mb-1`}>{value}</span>
            <span className={`text-xs font-bold ${textClass} opacity-80 uppercase tracking-wide`}>{label}</span>
        </div>
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard 
                value={balance} 
                label="Outstanding Balance" 
                bgClass="bg-[#F3E8FF]" 
                textClass="text-[#7E22CE]" 
            />
            <StatCard 
                value={clearedCount} 
                label="Faculties Cleared" 
                bgClass="bg-[#DCFCE7]" 
                textClass="text-[#15803D]" 
            />
            <StatCard 
                value={pendingCount} 
                label="Pending Faculties" 
                bgClass="bg-[#FFEDD5]" 
                textClass="text-[#C2410C]" 
            />
            <StatCard 
                value={pendingTasksCount} 
                label="Total Tasks" 
                bgClass="bg-[#DBEAFE]" 
                textClass="text-[#1D4ED8]" 
            />
        </div>
    );
}