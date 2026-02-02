import { ComponentProps, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
} & ComponentProps<"button">;

const variantClasses = {
  
  primary: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900",
  
  
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500",
  
  
  outline: "border border-gray-200 bg-white text-slate-700 hover:bg-gray-50 focus:ring-slate-900",
  
  
  ghost: "text-slate-700 hover:bg-gray-100 focus:ring-slate-900",
};

const sizeClasses = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm", 
  lg: "h-12 px-6 text-base",
};

const Button = ({
  children,
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  className = "",
  ...props
}: ButtonProps) => {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg 
        font-bold transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 
        disabled:cursor-not-allowed disabled:opacity-50 
        ${variantClasses[variant]} 
        ${sizeClasses[size]} 
        ${className}
      `}
      {...props}
    >
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  )
}

export default Button