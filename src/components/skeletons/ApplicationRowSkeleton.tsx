export default function ApplicationRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl gap-4">
      <div className="flex items-center gap-3 w-2/3">
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full skeleton shrink-0" />
        <div className="space-y-2 w-full">
          {/* Name & Title */}
          <div className="h-4 w-1/3 skeleton" />
          <div className="h-3 w-1/2 skeleton" />
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {/* Status Badge */}
        <div className="h-6 w-16 rounded-full skeleton" />
        {/* Action Button */}
        <div className="h-8 w-20 rounded-lg skeleton" />
      </div>
    </div>
  );
}
