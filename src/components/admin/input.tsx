import { ComponentProps, ReactNode } from "react";

type InputProps = {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
} & ComponentProps<"input">;

const Input = ({ leftIcon, rightIcon, className = "", ...props }: InputProps) => {
  return (
    <div className="relative flex items-center w-full">
      {/* Left Icon Wrapper */}
      {leftIcon && (
        <div className="pointer-events-none absolute left-3 flex items-center justify-center text-gray-400">
          {leftIcon}
        </div>
      )}

      {/* Input Field */}
      <input
        className={`
          h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-slate-900 
          placeholder:text-gray-400 
          /* Focus States: Changed to Slate-900 to match your buttons */
          focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 
          disabled:cursor-not-allowed disabled:opacity-50
          transition-colors
          ${leftIcon ? "pl-10" : ""} 
          ${rightIcon ? "pr-10" : ""} 
          ${className}
        `}
        {...props}
      />

      {/* Right Icon Wrapper */}
      {rightIcon && (
        <div className="absolute right-3 flex items-center justify-center text-gray-400">
          {rightIcon}
        </div>
      )}
    </div>
  );
}

export default Input