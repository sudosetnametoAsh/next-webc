import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className="space-y-6">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function TemplateCardsSkeleton({ label }: { label: string }) {
  return (
    <LoadingRegion label={label}>
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/90">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function ListSkeleton({ label }: { label: string }) {
  return (
    <LoadingRegion label={label}>
      <div className="space-y-3 p-4 sm:p-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <Skeleton className="h-10 w-10 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function DashboardSkeleton({ label = "Loading dashboard" }: { label?: string }) {
  return (
    <LoadingRegion label={label}>
      <Skeleton className="h-9 w-2/3 max-w-sm" />
      <Skeleton className="h-4 w-full max-w-lg" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </LoadingRegion>
  );
}
