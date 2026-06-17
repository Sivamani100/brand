export default function CardItemSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div className="space-y-2 w-3/4">
          {/* Title */}
          <div className="h-5 w-5/6 skeleton" />
          {/* Brand Name */}
          <div className="h-3.5 w-1/2 skeleton" />
        </div>
        {/* Avatar Placeholder */}
        <div className="h-10 w-10 rounded-full skeleton" />
      </div>
      
      {/* Description */}
      <div className="space-y-2 pt-2">
        <div className="h-3.5 w-full skeleton" />
        <div className="h-3.5 w-5/6 skeleton" />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 pt-2">
        <div className="h-6 w-16 rounded-full skeleton" />
        <div className="h-6 w-20 rounded-full skeleton" />
        <div className="h-6 w-14 rounded-full skeleton" />
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-[var(--color-border)]">
        <div className="h-4 w-24 skeleton" />
        <div className="h-8 w-20 rounded-lg skeleton" />
      </div>
    </div>
  );
}
