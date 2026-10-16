import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800", className)}
    />
  );
}
