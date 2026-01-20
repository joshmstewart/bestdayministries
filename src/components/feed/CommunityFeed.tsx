import { useEffect, useRef, useCallback, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedItem } from "./FeedItem";
import { FeedTypeFilter } from "./FeedTypeFilter";
import { useCommunityFeed, ItemType } from "@/hooks/useCommunityFeed";
import { useAuth } from "@/contexts/AuthContext";

export function CommunityFeed() {
  const [typeFilter, setTypeFilter] = useState<ItemType | null>(null);
  const { items, loading, loadingMore, hasMore, loadMore, refresh } = useCommunityFeed({ typeFilter });
  const { isAuthenticated } = useAuth();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
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
        <FeedTypeFilter selectedType={typeFilter} onTypeChange={setTypeFilter} />

        <div className="text-center py-12 bg-card/50 rounded-xl border border-border">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {typeFilter ? `No ${typeFilter} posts yet` : "No activity yet"}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            {typeFilter 
              ? "Try selecting a different category or be the first to share!" 
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
    <div className="space-y-4">
      {/* Type filter */}
      <FeedTypeFilter selectedType={typeFilter} onTypeChange={setTypeFilter} />

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    </div>
  );
}
