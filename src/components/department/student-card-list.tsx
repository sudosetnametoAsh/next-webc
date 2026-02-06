"use client";
import { useFethStudents } from "@/hooks/department/fetch-student-list";
import { useFetchStudentTasks } from "@/hooks/department/fetch-student-tasks";
import { useState } from "react";

type Props = {
    courseIds: string[];
};

export default function StudentCardList({ courseIds }: Props) {
    const [expandedStudent, setExpandedStudent] = useState<string>("");
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

    // For now, fetch from the first course selected
    const courseId = courseIds[0];
    const { data: students = [] } = useFethStudents(courseId);
    const { data: tasks = [] } = useFetchStudentTasks(
        expandedStudent || null,
        "02000183861"
    );

    const toggleStudent = (studentId: string) => {
        setExpandedStudent(expandedStudent === studentId ? "" : studentId);
    };

    const toggleSelectStudent = (studentId: string) => {
        const newSelected = new Set(selectedStudents);
        if (newSelected.has(studentId)) {
            newSelected.delete(studentId);
        } else {
            newSelected.add(studentId);
        }
        setSelectedStudents(newSelected);
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case "Cleared":
                return "#4caf50";
            case "In-progress":
                return "#fbc02d";
            case "Pending":
                return "#f44336";
            default:
                return "#999";
        }
    };

    return (
        <div className="student-cards-section">
            {students.map((student, index) => (
                <div key={index} className="student-card">
                    <div className="card-header">
                        <div className="student-header-left">
                            <input
                                type="checkbox"
                                checked={selectedStudents.has(student.student_id)}
                                onChange={() => toggleSelectStudent(student.student_id)}
                                className="student-checkbox"
                            />
                            <div className="student-name-section">
                                <strong className="student-name">{student.student_name}</strong>
                                <span className="status-badge cleared">Cleared</span>
                            </div>
                            <span className="student-id-small">#{student.student_id}</span>
                            <a href={`mailto:${student.student_id}@school.edu`} className="email-link">
                                📧
                            </a>
                        </div>
                        <div className="student-header-right">
                            <span className="signed-badge">✓ Signed</span>
                            <button
                                className="tasks-btn"
                                onClick={() => toggleStudent(student.student_id)}
                            >
                                Show Tasks (0/2)
                            </button>
                        </div>
                    </div>

                    {expandedStudent === student.student_id && (
                        <div className="card-body">
                            <div className="tasks-list">
                                {tasks.map((task, idx) => (
                                    <div key={idx} className="task-item">
                                        <input type="checkbox" className="task-checkbox" />
                                        <span className="task-description">{task.description}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="card-footer">
                                <button className="footer-btn mark-signed">Mark as Signed</button>
                                <button className="footer-btn show-tasks">Show Tasks</button>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            <style jsx>{`
                .student-cards-section {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-top: 20px;
                }

                .student-card {
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    background: white;
                    overflow: hidden;
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    border-bottom: 1px solid #f0f0f0;
                    cursor: pointer;
                    transition: background 0.2s ease;
                }

                .card-header:hover {
                    background: #fafafa;
                }

                .student-header-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex: 1;
                }

                .student-checkbox {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }

                .student-name-section {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .student-name {
                    font-size: 14px;
                    color: #333;
                }

                .status-badge {
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                }

                .status-badge.cleared {
                    background: #e8f5e9;
                    color: #4caf50;
                }

                .status-badge.in-progress {
                    background: #fff8e1;
                    color: #fbc02d;
                }

                .status-badge.pending {
                    background: #ffebee;
                    color: #f44336;
                }

                .student-id-small {
                    font-size: 12px;
                    color: #999;
                    margin-left: 8px;
                }

                .email-link {
                    text-decoration: none;
                    font-size: 14px;
                    cursor: pointer;
                    margin: 0 8px;
                }

                .student-header-right {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .signed-badge {
                    background: #e8f5e9;
                    color: #4caf50;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                }

                .tasks-btn {
                    padding: 6px 12px;
                    background: #e3f2fd;
                    color: #1976d2;
                    border: 1px solid #1976d2;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }

                .tasks-btn:hover {
                    background: #1976d2;
                    color: white;
                }

                .card-body {
                    padding: 16px;
                    background: #fafafa;
                    border-top: 1px solid #f0f0f0;
                    animation: slideDown 0.2s ease;
                }

                .tasks-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-bottom: 16px;
                }

                .task-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px;
                    background: white;
                    border-radius: 4px;
                }

                .task-checkbox {
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                }

                .task-description {
                    font-size: 13px;
                    color: #555;
                }

                .card-footer {
                    display: flex;
                    gap: 8px;
                    margin-top: 12px;
                }

                .footer-btn {
                    padding: 8px 16px;
                    border: 1px solid #ddd;
                    background: white;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    color: #666;
                    transition: all 0.2s ease;
                }

                .footer-btn:hover {
                    background: #f5f5f5;
                    border-color: #1976d2;
                    color: #1976d2;
                }

                .footer-btn.mark-signed {
                    flex: 1;
                }

                .footer-btn.show-tasks {
                    flex: 1;
                }

                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
