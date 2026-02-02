import { ComponentProps, ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
} & ComponentProps<"span">;

// Updated colors to include Borders and lighter backgrounds to match the "Tag" look
const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gray-50 text-gray-600 border-gray-200", // Matches Department Tags
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  error:   "bg-red-50 text-red-700 border-red-200",
  info:    "bg-blue-50 text-blue-700 border-blue-200",
};

const Badge = ({ children, variant = "default", className = "", ...props }: BadgeProps) => {
  return (
    <span
      className={`
        inline-flex items-center justify-center 
        rounded-lg border px-2 py-1 
        text-[10px] font-bold uppercase tracking-wide 
        transition-colors
        ${variantClasses[variant]} 
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge