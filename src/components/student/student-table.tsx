"use client";
import { useFecthRecords } from "@/hooks/student/fetch-student-data";

export default function StudentTable() {
    const { data, isLoading } = useFecthRecords();
    
    if (isLoading) return <p>One more sec...</p>;

    if (data?.students?.length === 0) {
        return (
            <div>
                <div>
                    Student: <strong>{data?.name}</strong>
                </div>
                <p>No clearance records</p>
            </div>
        );
    }

    return (
        <div>
            <div>
                Student: <strong>{data?.name}</strong>
            </div>
            <div>
                Balance: <strong>{data?.balance?.[0]?.amount ?? 0}</strong>
            </div>
            <table style={{ borderCollapse: "collapse", width: "700px" }}>
                <thead>
                    <tr>
                        <th style={{ border: "1px solid black", padding: "8px" }}>Department</th>
                        <th style={{ border: "1px solid black", padding: "8px" }}>Staff</th>
                        <th style={{ border: "1px solid black", padding: "8px" }}>Status</th>
                        <th style={{ border: "none", width: "30px" }}></th>
                    </tr>
                </thead>

                <tbody>
                    {data?.students?.map((row, index) => (
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
                            <td style={{ border: "1px solid black", padding: "8px" }}>
                                {row.status}
                            </td>
                            {/* requirement column */}
                            <td style={{ border: "none", padding: "0", textAlign: "center" }}>
                                {row.requirements_status && row.requirements_status.length > 0 && (
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
                                            {row.requirements_status
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
