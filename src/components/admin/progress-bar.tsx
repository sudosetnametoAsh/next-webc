import { ComponentProps } from "react";

type ProgressBarProps = {
  value: number; // 0-100
  showLabel?: boolean;
  label?: string; // Added optional label prop
  size?: "sm" | "md" | "lg";
} & Omit<ComponentProps<"div">, "children">;

const sizeClasses = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
};

const ProgressBar = ({
  value,
  showLabel = true,
  label = "Completion Rate",
  size = "md",
  className = "",
  ...props
}: ProgressBarProps) => {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={`w-full ${className}`} {...props}>
      {/* Label Section */}
      {showLabel && (
        <div className="mb-2 flex items-end justify-between">
          {/* Matches the 'text-xs font-medium text-gray-400' from your design */}
          <span className="text-xs font-medium text-gray-400">{label}</span>
          
          {/* Matches the bold percentage text */}
          <span className="text-sm font-bold text-slate-900">{clampedValue}%</span>
        </div>
      )}

      {/* Bar Background */}
      <div className={`w-full overflow-hidden rounded-full bg-gray-100 ${sizeClasses[size]}`}>
        {/* Fill Bar: Changed from emerald-500 to slate-900 (Black) */}
        <div
          className="h-full rounded-full bg-slate-900 transition-all duration-300"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar