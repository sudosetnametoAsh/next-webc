import { ComponentProps } from "react";

type ProgressBarProps = {
  value: number; // 0-100
  showLabel?: boolean;
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
  size = "md",
  className = "",
  ...props
}: ProgressBarProps) => {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={`w-full ${className}`} {...props}>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm text-gray-500">Completion Rate</span>
          <span className="text-sm font-medium text-gray-900">{clampedValue}%</span>
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-gray-100 ${sizeClasses[size]}`}>
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar