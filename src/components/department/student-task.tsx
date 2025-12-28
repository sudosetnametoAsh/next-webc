import { useFetchStudentTasks } from "@/hooks/department/fetch-student-tasks";

type Params = {
    studentId: string
}
export function StudentTaskList({ studentId }: Params) {
    const { data: tasks = [], isLoading, error } = useFetchStudentTasks(studentId, "02000183861");

    if (isLoading) {
        return <p style={{ padding: '0 20px 20px' }}>Loading tasks...</p>;
    }

    if (error) {
        return <p style={{ padding: '0 20px 20px', color: 'red' }}>Could not load tasks.</p>;
    }
    
    if (tasks.length === 0) {
        return <p style={{ padding: '0 20px 20px', color: '#6b7280' }}>No tasks found for this student.</p>;
    }

    return (
        <ul style={{ listStyle: 'none', padding: '0 20px 20px', margin: 0 }}>
            {tasks.map((task, index) => (
                <li key={index} style={{ padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                    {task.description}
                </li>
            ))}
        </ul>
    );
}