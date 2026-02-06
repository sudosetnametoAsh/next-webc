"use client";
import { useFetchStaffData } from "@/hooks/department/fetch-staff";
import { useState } from "react";

export default function StaffList() {
    const [openId, setOpenId] = useState<string>("");
    const { data, isLoading, error } = useFetchStaffData();

    if (isLoading) {
        return <div>Loading staff data...</div>;
    }

    if (error) {
        return <div>Error loading staff: {error.message}</div>;
    }

    if (!data || data.length === 0) {
        return <div>No staff members found</div>;
    }

    const toggle = (id: string) => {
        setOpenId(openId === id ? "" : id);
    };

    return (
        <>
            <div className="staff-container">

                {data?.map((staff) => (
                    <div className="staff-item" key={staff.staff_id}>
                        <div className="staff-header" onClick={() => toggle(staff.staff_id)}>
                            <div className="staff-info">
                                <strong>{staff.staff_name}</strong>
                                <span className="staff-id">({staff.staff_id})</span>
                                <span className="department-badge">{staff.departments?.dept_name}</span>
                            </div>
                        </div>

                        {openId === staff.staff_id && (
                            <div className="staff-body">
                                <div className="tasks-section">
                                    <p className="section-title">Clearance Tasks:</p>
                                    {staff.clearance_tasks_preset && staff.clearance_tasks_preset.length > 0 ? (
                                        <ul className="tasks-list">
                                            {staff.clearance_tasks_preset.map((task, index) => (
                                                <li key={index}>{task.description}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="no-tasks">No clearance tasks assigned</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style jsx>{`
                .staff-container {
                    margin-top: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .staff-item {
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    overflow: hidden;
                    background: #fff;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .staff-header {
                    padding: 12px 16px;
                    cursor: pointer;
                    background: #f7f7f7;
                    font-weight: 600;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: background 0.2s ease;
                }

                .staff-header:hover {
                    background: #ececec;
                }

                .staff-header::after {
                    content: "▸";
                    transition: transform 0.2s ease;
                    font-size: 14px;
                }

                .staff-item:has(.staff-body) .staff-header::after {
                    transform: rotate(90deg);
                }

                .staff-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex: 1;
                }

                .staff-id {
                    font-weight: normal;
                    color: #666;
                    font-size: 14px;
                }

                .department-badge {
                    background: #e3f2fd;
                    color: #1976d2;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: normal;
                }

                .staff-body {
                    padding: 12px 16px;
                    border-top: 1px solid #eee;
                    background: #fafafa;
                    animation: slideDown 0.2s ease;
                }

                .tasks-section {
                    margin-bottom: 12px;
                }

                .section-title {
                    font-weight: 600;
                    margin: 0 0 8px 0;
                    font-size: 14px;
                    color: #333;
                }

                .tasks-list {
                    margin: 0;
                    padding-left: 20px;
                    list-style-type: disc;
                }

                .tasks-list li {
                    margin: 4px 0;
                    font-size: 14px;
                    color: #555;
                }

                .no-tasks {
                    font-style: italic;
                    color: #999;
                    margin: 0;
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
