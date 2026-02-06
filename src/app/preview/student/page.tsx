"use client";

export default function StudentPreview() {
    // Mock student data for preview
    const mockData = {
        name: "Juan Dela Cruz",
        balance: [{ amount: 5000 }],
        students: [
            {
                clearance_templates: {
                    departments: {
                        dept_name: "Registrar"
                    },
                    staffs: {
                        staff_name: "Dr. Maria Santos"
                    }
                },
                status: "Cleared",
                student_tasks_status: []
            },
            {
                clearance_templates: {
                    departments: {
                        dept_name: "Accounting"
                    },
                    staffs: {
                        staff_name: "Mr. John Reyes"
                    }
                },
                status: "Pending",
                student_tasks_status: [
                    {
                        clearance_tasks_preset: {
                            description: "Clear outstanding fees of ₱2,500"
                        }
                    },
                    {
                        clearance_tasks_preset: {
                            description: "Verify payment arrangement"
                        }
                    }
                ]
            },
            {
                clearance_templates: {
                    departments: {
                        dept_name: "Library"
                    },
                    staffs: {
                        staff_name: "Ms. Anna Lopez"
                    }
                },
                status: "Cleared",
                student_tasks_status: []
            },
            {
                clearance_templates: {
                    departments: {
                        dept_name: "IT Department"
                    },
                    staffs: {
                        staff_name: "Mr. Robert Santos"
                    }
                },
                status: "Pending",
                student_tasks_status: [
                    {
                        clearance_tasks_preset: {
                            description: "Return IT equipment (laptop, access card)"
                        }
                    }
                ]
            }
        ]
    };

    return (
        <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
            <h1>Student Clearance Status - Preview</h1>
            <p style={{ color: "#666", marginBottom: "20px" }}>
                This is a preview of the student clearance layout without authentication
            </p>

            <div>
                <div style={{ marginBottom: "16px" }}>
                    Student: <strong>{mockData.name}</strong>
                </div>
                <div style={{ marginBottom: "20px" }}>
                    Balance: <strong>₱{mockData.balance?.[0]?.amount ?? 0}</strong>
                </div>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                    <thead>
                        <tr>
                            <th style={{ border: "1px solid black", padding: "8px", textAlign: "left" }}>Department</th>
                            <th style={{ border: "1px solid black", padding: "8px", textAlign: "left" }}>Staff</th>
                            <th style={{ border: "1px solid black", padding: "8px", textAlign: "left" }}>Status</th>
                            <th style={{ border: "none", width: "30px" }}></th>
                        </tr>
                    </thead>

                    <tbody>
                        {mockData.students?.map((row, index) => (
                            <tr key={index}>
                                {/* department column */}
                                <td style={{ border: "1px solid black", padding: "8px" }}>
                                    {row.clearance_templates?.departments?.dept_name}
                                </td>
                                {/* staff column */}
                                <td style={{ border: "1px solid black", padding: "8px" }}>
                                    {row.clearance_templates?.staffs?.staff_name}
                                </td>
                                {/* status column */}
                                <td style={{ 
                                    border: "1px solid black", 
                                    padding: "8px",
                                    color: row.status === "Cleared" ? "#4caf50" : "#ff9800",
                                    fontWeight: "600"
                                }}>
                                    {row.status}
                                </td>
                                {/* requirement column */}
                                <td style={{ border: "none", padding: "0", textAlign: "center" }}>
                                    {row.student_tasks_status && row.student_tasks_status.length > 0 && (
                                        <div
                                            className="tooltip-wrapper"
                                            style={{ display: "inline-block", position: "relative" }}
                                        >
                                            <span
                                                style={{
                                                    color: "red",
                                                    fontWeight: "bold",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                ! 
                                            </span>

                                            <div className="tooltip-content">
                                                {row.student_tasks_status
                                                    .map(
                                                        (req) =>
                                                            `• ${req.clearance_tasks_preset?.description ?? ""}`
                                                    )
                                                    .join("\n")}
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <style jsx>{`
                .tooltip-content {
                    visibility: hidden;
                    opacity: 0;
                    transition: opacity .7s ease;
                    background-color: #333;
                    color: #fff;
                    text-align: left;
                    padding: 6px;
                    border-radius: 6px;
                    position: absolute;
                    top: 50%;
                    left: 100%;
                    margin-left: 10px;
                    transform: translateY(-50%);
                    white-space: pre-wrap;
                    width: 250px;
                    z-index: 10;
                }

                .tooltip-wrapper:hover .tooltip-content {
                    visibility: visible;
                    opacity: 1;
                }
            `}</style>
        </div>
    );
}
