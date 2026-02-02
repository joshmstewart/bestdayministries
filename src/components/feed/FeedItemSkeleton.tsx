import { Skeleton } from "@/components/ui/skeleton";

export function FeedItemSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      
      {/* Image area - 16:9 aspect ratio */}
      <Skeleton className="aspect-video w-full" />
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        
        {/* Actions */}
        <div className="flex items-center gap-4 pt-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-8 ml-auto" />
        </div>
      </div>
    </div>
  );
}
