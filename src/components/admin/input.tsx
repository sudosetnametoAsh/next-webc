import { ComponentProps, ReactNode } from "react";

type InputProps = {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
} & ComponentProps<"input">;

const Input = ({ leftIcon, rightIcon, className = "", ...props }: InputProps) => {
  return (
    <div className="relative flex items-center">
      {leftIcon && (
        <div className="pointer-events-none absolute left-3 text-gray-400">{leftIcon}</div>
      )}
      <input
        className={`h-10 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-100 ${leftIcon ? "pl-10" : ""} ${rightIcon ? "pr-10" : ""} ${className}`}
        {...props}
      />
      {rightIcon && <div className="absolute right-3 text-gray-400">{rightIcon}</div>}
    </div>
  );
}

export default Input