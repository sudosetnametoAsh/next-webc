import { ComponentProps } from "react";

type AvatarProps = {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
} & Omit<ComponentProps<"div">, "children">;

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

const Avatar = ({ name, src, size = "md", className = "", ...props }: AvatarProps) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-full bg-emerald-600 font-medium text-white ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

export default Avatar;