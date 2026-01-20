import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedItem } from "./FeedItem";
import { FeedTypeFilter } from "./FeedTypeFilter";
import { useCommunityFeed, ItemType } from "@/hooks/useCommunityFeed";
import { useAuth } from "@/contexts/AuthContext";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useUnseenFeedCount } from "@/hooks/useUnseenFeedCount";

// Estimated height for feed items (for virtual scroll optimization)
const ESTIMATED_ITEM_HEIGHT = 400;

export function CommunityFeed() {
  const [typeFilters, setTypeFilters] = useState<ItemType[]>([]);
  const { items, loading, loadingMore, hasMore, loadMore, refresh } = useCommunityFeed({ typeFilters });
  const { isAuthenticated } = useAuth();
  const { markAsSeen } = useUnseenFeedCount();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Mark feed as seen when user views it
  useEffect(() => {
    if (isAuthenticated && items.length > 0) {
      markAsSeen();
    }
  }, [isAuthenticated, items.length, markAsSeen]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);
  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loadingMore) {
        loadMore();
      }
    },
    [hasMore, loadingMore, loadMore]
  );

  useEffect(() => {
    const currentLoadMoreRef = loadMoreRef.current;
    
    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "200px",
      threshold: 0,
    });

    if (currentLoadMoreRef) {
      observerRef.current.observe(currentLoadMoreRef);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12 bg-card/50 rounded-xl border border-border">
        <Sparkles className="h-12 w-12 mx-auto text-primary mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Sign in to see What's New
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Join our community to see the latest creations, posts, and activities from members.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Filter skeleton */}
        <div className="flex gap-2 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 w-20 bg-muted rounded-md animate-pulse shrink-0" />
          ))}
        </div>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl overflow-hidden animate-pulse"
          >
            <div className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            </div>
            <div className="aspect-video bg-muted" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        {/* Type filter */}
        <FeedTypeFilter selectedTypes={typeFilters} onTypesChange={setTypeFilters} />

        <div className="text-center py-12 bg-card/50 rounded-xl border border-border">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {typeFilters.length > 0 ? `No matching posts yet` : "No activity yet"}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            {typeFilters.length > 0 
              ? "Try selecting different categories or be the first to share!" 
              : "Be the first to share something with the community!"}
          </p>
          <Button onClick={refresh} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className="space-y-4">
      {/* Type filter */}
      <FeedTypeFilter selectedTypes={typeFilters} onTypesChange={setTypeFilters} />

      {/* Refresh button */}
      <div className="flex justify-end">
        <Button
          onClick={refresh}
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Feed items grid - single column on mobile, 2 on larger screens */}
      <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {items.map((item) => (
          <FeedItem key={`${item.item_type}-${item.id}`} item={item} onRefresh={refresh} />
        ))}
      </div>

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="py-4 flex justify-center">
        {loadingMore && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading more...</span>
          </div>
        )}
        {!hasMore && items.length > 0 && (
          <p className="text-sm text-muted-foreground">
            You've reached the end of the feed
          </p>
        )}
      </div>
    </PullToRefresh>
  );
}
