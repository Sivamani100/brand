import CardItemSkeleton from "@/components/skeletons/CardItemSkeleton";

export default function BrandCardsLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-48 skeleton" />
          <div className="h-4 w-80 skeleton" />
        </div>
        <div className="h-10 w-36 rounded-full skeleton" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <CardItemSkeleton key={n} />
        ))}
      </div>
    </div>
  );
}
