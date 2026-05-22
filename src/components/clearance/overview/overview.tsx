import { Building, Clock, Users } from "lucide-react";
import StatCard from "../stat-card";
import ProgressCard from "../progress-card";
import DepartmenList from "../department-list";
import { getClearanceRecordsPromise, getSummaryPromise } from "@/modules/clearance/application/repository/dashboard-repository";

export default function Overview({ summary, records }: { summary: getSummaryPromise; records: getClearanceRecordsPromise }) {
    return (

        <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4">

            {/* TOP STATS SECTION */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <StatCard
                    label="Signed"
                    value={summary.signed}
                    icon={Building}
                    colorClass="text-black"
                    bgClass="bg-gray-100"
                />
                <StatCard
                    label="Incomplete"
                    value={summary.incomplete}
                    icon={Users}
                    colorClass="text-black"
                    bgClass="bg-gray-100"
                />
                <StatCard
                    label="Pending"
                    value={summary.pending}
                    icon={Clock}
                    colorClass="text-black"
                    bgClass="bg-gray-100"
                />
                {/* <StatCard label="Completed" value="0" icon={CheckCircle} colorClass="text-green-600" bgClass="bg-green-50" /> */}
            </div>

            {/* PROGRESS CARD SECTION */}
            <ProgressCard summary={summary} />

            {/* DEPARTMENTS GRID */}
            <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <h2 className="text-center text-lg font-bold text-gray-800">
                        Department Status
                    </h2>
                    <span className="cursor-pointer text-xs font-semibold text-blue-600">
                        {/* View All */}
                    </span>
                </div>

                <DepartmenList records={records} />
            </section>
        </section>
    )
}
