import DirectoryCardSkeleton from "@/components/skeletons/DirectoryCardSkeleton";

export default function InfluencerBrandsLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="h-8 w-48 skeleton" />
        <div className="h-4 w-80 skeleton" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-4">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <DirectoryCardSkeleton key={n} />
        ))}
      </div>
    </div>
  );
}
