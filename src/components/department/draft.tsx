"use client";
import { useFetchStaffData } from "@/hooks/fetch-staff-data";
import { useFetchStudentTasks } from "@/hooks/fetch-student-tasks";
import { useState } from "react";

export default function Page() {
    const [openId, setOpenId] = useState<string>("");
    const { data: tasks = [] } = useFetchStudentTasks(openId, "02000183861");
    const { data: courses = [], isLoading, error } = useFetchStaffData(); // Fetch data from endpoint
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null); // State to store course id

    const toggle = (id: string) => {
        setOpenId(openId === id ? "" : id);
    };

    console.log("data is: ", tasks[0]);
    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    if (courses.length === 0) return <div>No courses assigned to you.</div>;

    const selectedCourse =
        courses.find((item) => item.course_id === selectedCourseId) ?? courses[0]; // fallback to first course

    return (
        <>
            <h3>Courses Assigned to You</h3>

            <div className="course-nav">
                {courses.map((item) => (
                    <button
                        key={item.course_id}
                        className={`course-btn ${selectedCourse.course_id === item.course_id ? "active" : ""
                            }`}
                        onClick={() => setSelectedCourseId(item.course_id)}
                    >
                        {item.course_name}
                    </button>
                ))}
            </div>

            <div className="students-container">
                <h4>{selectedCourse.course_name} Students</h4>

                {selectedCourse.students.map((student) => (
                    <div className="student-container" key={student.student_id}>
                        <div
                            className="student-header"
                            onClick={() => toggle(student.student_id)}
                        >
                            {student.student_name} ({student.student_id})
                        </div>

                        {openId === student.student_id && (
                            <div className="student-body">
                                <p> Tasks: </p>
                                {tasks.map((task, index) => (
                                    <p key={index}>{task.description}</p>
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
    );
}
