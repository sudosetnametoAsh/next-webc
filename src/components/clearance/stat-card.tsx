import { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  bgClass,
}: StatCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className="text-3xl font-bold text-gray-900">{value}</span>
      </div>
      <div
        className={`flex items-center justify-center rounded-xl p-2.5 ${bgClass} ${colorClass}`}
      >
        <Icon size={24} />
      </div>
    </div>
  );
}
