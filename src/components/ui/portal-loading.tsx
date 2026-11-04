export default function PortalLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-6 p-4 sm:p-6">
      <p className="text-sm text-portal-muted">{label}</p>
      <div aria-hidden="true" className="space-y-6 animate-pulse motion-reduce:animate-none">
        <div className="h-32 rounded-2xl bg-portal-surface" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 rounded-2xl bg-portal-surface" />
          <div className="h-64 rounded-2xl bg-portal-surface" />
        </div>
      </div>
    </div>
  );
}
