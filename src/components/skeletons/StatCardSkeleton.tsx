export default function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-3 shadow-sm">
      {/* Title */}
      <div className="h-4 w-1/3 skeleton" />
      {/* Big Number */}
      <div className="h-8 w-1/2 skeleton" />
      {/* Description */}
      <div className="h-3 w-3/4 skeleton" />
    </div>
  );
}
