"use client";
import { useStudents } from "@/hooks/use-students"

export default function StudentTable() {
    const { data } = useStudents();
    console.log(data)

    if (!data?.students || data.students.length === 0) {
        return (
            <div>
                <div>Student: <strong>{data?.name}</strong></div>
                <p>No clearance records</p>
            </div>
        );
    }

    return (
        <div>
            <div>Student: <strong>{data?.name}</strong></div>
            <table style={{ borderCollapse: "collapse", width: "700px" }}>
                <thead>
                    <tr>
                        <th style={{ border: "1px solid black", padding: "8px" }}>Department</th>
                        <th style={{ border: "1px solid black", padding: "8px" }}>Staff</th>
                        <th style={{ border: "1px solid black", padding: "8px" }}>Status</th>
                    </tr>
                </thead>

                <tbody>
                    {data?.students?.map((row, index) => (
                        <tr key={index}>
                            <td style={{ border: "1px solid black", padding: "8px" }}>
                                {row.clearancetemplates.departments.dept_name}
                            </td>
                            <td style={{ border: "1px solid black", padding: "8px" }}>
                                {row.clearancetemplates?.staffs?.staff_name}
                            </td>
                            <td style={{ border: "1px solid black", padding: "8px" }}>
                                {row.status}
                            </td>
                        </tr>
                    ))}
                </tbody>

            </table>
        </div>
    )
}