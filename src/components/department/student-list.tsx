import { useFethStudents } from "@/hooks/department/fetch-student-list";
import { useFetchStudentTasks } from "@/hooks/department/fetch-student-tasks";
import { useState } from "react";

type Props = {
    courseId: string
}

export default function StudentList({ courseId }: Props) {
    const [openId, setOpenId] = useState<string>("");
    const { data } = useFethStudents(courseId)
    const { data: tasks = [] } = useFetchStudentTasks(openId, "02000183861")


    const toggle = (id: string) => {
        setOpenId(openId === id ? "" : id);
    };

    return (
        <>
            <div className="students-container">

                {data?.map((student) => (
                    <div className="student-container" key={student.student_id}>
                        <div className="student-header" onClick={() => toggle(student.student_id)}>
                            {student.student_name} ({student.student_id})
                        </div>

                        {openId === student.student_id && (
                            <div className="student-body">
                                <p>Details:</p>
                                {tasks.map((task, index) => (
                                    <p key={index}> {task.description} </p>
                                ))}
                            </div>
                        )}
                    </div>



                ))}
            </div>

            <style jsx>{`
                .students-container {
                margin-top: 20px;
                }

                .student-container {
                border: 1px solid #ddd;
                border-radius: 6px;
                margin-bottom: 10px;
                overflow: hidden;
                background: #fff;
                }

                .student-header {
                padding: 12px 16px;
                cursor: pointer;
                background: #f7f7f7;
                font-weight: 600;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: background 0.2s ease;
                }

                .student-header:hover {
                background: #ececec;
                }

                .student-header::after {
                content: "▸";
                transition: transform 0.2s ease;
                }

                .student-container:has(.student-body) .student-header::after {
                transform: rotate(90deg);
                }

                .student-body {
                padding: 12px 16px;
                border-top: 1px solid #eee;
                background: #fafafa;
                animation: slideDown 0.2s ease;
                }

                .student-body p {
                margin: 6px 0;
                font-size: 14px;
                }

                @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-4px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
                }
            `}</style>

        </>
    )
}