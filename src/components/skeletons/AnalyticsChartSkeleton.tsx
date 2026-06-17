export default function AnalyticsChartSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4 shadow-sm h-80 flex flex-col justify-between">
      <div className="flex justify-between items-center">
        <div className="h-5 w-1/3 skeleton" />
        <div className="h-6 w-24 rounded-lg skeleton" />
      </div>
      
      {/* Bars/Lines Shimmer */}
      <div className="flex items-end justify-between h-48 px-4 gap-2">
        <div className="w-full h-1/4 skeleton rounded-t-md" />
        <div className="w-full h-1/2 skeleton rounded-t-md" />
        <div className="w-full h-3/4 skeleton rounded-t-md" />
        <div className="w-full h-2/3 skeleton rounded-t-md" />
        <div className="w-full h-5/6 skeleton rounded-t-md" />
        <div className="w-full h-1/3 skeleton rounded-t-md" />
        <div className="w-full h-full skeleton rounded-t-md" />
      </div>
      
      <div className="flex justify-between h-3">
        <div className="w-10 skeleton" />
        <div className="w-10 skeleton" />
        <div className="w-10 skeleton" />
        <div className="w-10 skeleton" />
        <div className="w-10 skeleton" />
      </div>
    </div>
  );
}
