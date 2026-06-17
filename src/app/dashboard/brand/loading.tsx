import StatCardSkeleton from "@/components/skeletons/StatCardSkeleton";
import CardItemSkeleton from "@/components/skeletons/CardItemSkeleton";

export default function BrandDashboardLoading() {
  return (
    <div className="space-y-8 p-6">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="h-8 w-64 skeleton" />
        <div className="h-4 w-96 skeleton" />
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <StatCardSkeleton key={n} />
        ))}
      </div>

      {/* Content Header */}
      <div className="flex justify-between items-center pt-4">
        <div className="h-6 w-40 skeleton" />
        <div className="h-10 w-32 rounded-full skeleton" />
      </div>

      {/* Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <CardItemSkeleton key={n} />
        ))}
      </div>
    </div>
  );
}
