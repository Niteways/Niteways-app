import { Skeleton } from "@/components/ui/skeleton";

interface VenueCardSkeletonProps {
  horizontal?: boolean;
}

export function VenueCardSkeleton({ horizontal = false }: VenueCardSkeletonProps) {
  if (horizontal) {
    return (
      <div className="flex gap-3 p-2 rounded-lg bg-gray-900/50">
        <Skeleton className="w-20 h-20 rounded-lg bg-gray-800" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 bg-gray-800" />
          <Skeleton className="h-3 w-1/2 bg-gray-800" />
          <Skeleton className="h-3 w-1/3 bg-gray-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden bg-gray-900/50">
      <Skeleton className="w-full aspect-[4/3] bg-gray-800" />
      <div className="p-2.5 space-y-2">
        <Skeleton className="h-4 w-3/4 bg-gray-800" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16 bg-gray-800" />
          <Skeleton className="h-3 w-12 bg-gray-800" />
        </div>
      </div>
    </div>
  );
}

export function VenueSectionSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40 bg-gray-800" />
        <Skeleton className="h-4 w-8 bg-gray-800" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
        {Array.from({ length: count }).map((_, i) => (
          <VenueCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
