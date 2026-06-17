export default function DirectoryCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4 text-center">
      {/* Avatar */}
      <div className="mx-auto h-20 w-20 rounded-full skeleton" />
      
      <div className="space-y-2">
        {/* Name */}
        <div className="mx-auto h-5 w-1/2 skeleton" />
        {/* Subtitle / Niche */}
        <div className="mx-auto h-3.5 w-1/3 skeleton" />
      </div>

      {/* Stats row */}
      <div className="flex justify-around py-2 border-t border-b border-[var(--color-border)]">
        <div className="space-y-1">
          <div className="h-4 w-12 skeleton" />
          <div className="h-3 w-8 skeleton" />
        </div>
        <div className="space-y-1">
          <div className="h-4 w-12 skeleton" />
          <div className="h-3 w-8 skeleton" />
        </div>
      </div>

      {/* Button */}
      <div className="h-9 w-full rounded-full skeleton" />
    </div>
  );
}
