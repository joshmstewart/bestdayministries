import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Heart, Loader2, X, Palette, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Lazy loading image component with blur placeholder
const LazyImage = ({ 
  src, 
  alt, 
  className,
}: { 
  src: string; 
  alt: string; 
  className?: string;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={imgRef} 
      className={cn("relative overflow-hidden", className)}
    >
      {/* Blur placeholder */}
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 transition-opacity duration-300",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
      />
      
      {isInView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  );
};

type SortOption = "newest" | "popular";

interface PublicColoring {
  id: string;
  thumbnail_url: string | null;
  likes_count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  creator_name: string | null;
  page_title: string | null;
  coloring_page_id: string;
  coloring_page: { id: string; title: string; image_url: string; book_id: string | null } | null;
  is_public: boolean;
}

interface ColoringCommunityGalleryProps {
  userId: string;
  onSelectColoring?: (page: any, loadSavedData?: boolean) => void;
}

export const ColoringCommunityGallery = ({ userId, onSelectColoring }: ColoringCommunityGalleryProps) => {
  const queryClient = useQueryClient();
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [likingColoring, setLikingColoring] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedColoring, setSelectedColoring] = useState<PublicColoring | null>(null);
  const [unsharing, setUnsharing] = useState(false);

  // Fetch colorings with React Query - exclude canvas_data to avoid timeout
  const { data: colorings = [], isLoading: loading } = useQuery({
    queryKey: ["community-colorings", sortBy],
    queryFn: async () => {
      const query = supabase
        .from("user_colorings")
        .select(`
          id,
          thumbnail_url,
          likes_count,
          created_at,
          updated_at,
          user_id,
          coloring_page_id,
          is_public,
          coloring_page:coloring_pages(id, title, image_url, book_id)
        `)
        .eq("is_public", true)
        .limit(50);

      if (sortBy === "newest") {
        query.order("created_at", { ascending: false });
      } else {
        query.order("likes_count", { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Fetch creator names separately
      const creatorIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", creatorIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || []);

      return data.map((coloring) => ({
        id: coloring.id,
        thumbnail_url: coloring.thumbnail_url,
        likes_count: coloring.likes_count || 0,
        created_at: coloring.created_at,
        updated_at: coloring.updated_at,
        user_id: coloring.user_id,
        creator_name: profileMap.get(coloring.user_id) || null,
        page_title: (coloring.coloring_page as any)?.title || null,
        coloring_page_id: coloring.coloring_page_id,
        coloring_page: coloring.coloring_page,
        is_public: coloring.is_public,
      })) as PublicColoring[];
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  // Fetch user's likes
  const { data: userLikesData } = useQuery({
    queryKey: ["user-coloring-likes", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("coloring_likes")
        .select("coloring_id")
        .eq("user_id", userId);
      return data?.map((l) => l.coloring_id) || [];
    },
    enabled: !!userId,
    staleTime: 30000,
  });

  // Update userLikes set when data changes
  useEffect(() => {
    if (userLikesData) {
      setUserLikes(new Set(userLikesData));
    }
  }, [userLikesData]);

  const toggleLike = async (coloringId: string) => {
    setLikingColoring(coloringId);
    const isLiked = userLikes.has(coloringId);
    const currentLikes = colorings.find(c => c.id === coloringId)?.likes_count || 0;

    try {
      if (isLiked) {
        await supabase
          .from("coloring_likes")
          .delete()
          .eq("coloring_id", coloringId)
          .eq("user_id", userId);

        // Update likes count in user_colorings
        await supabase
          .from("user_colorings")
          .update({ likes_count: Math.max(0, currentLikes - 1) })
          .eq("id", coloringId);

        setUserLikes((prev) => {
          const next = new Set(prev);
          next.delete(coloringId);
          return next;
        });
        if (selectedColoring?.id === coloringId) {
          setSelectedColoring(prev => prev ? { ...prev, likes_count: Math.max(0, prev.likes_count - 1) } : null);
        }
        // Invalidate query to refresh likes count
        queryClient.invalidateQueries({ queryKey: ["community-colorings"] });
      } else {
        await supabase.from("coloring_likes").insert({
          coloring_id: coloringId,
          user_id: userId,
        });

        // Update likes count in user_colorings
        await supabase
          .from("user_colorings")
          .update({ likes_count: currentLikes + 1 })
          .eq("id", coloringId);

        setUserLikes((prev) => new Set([...prev, coloringId]));
        if (selectedColoring?.id === coloringId) {
          setSelectedColoring(prev => prev ? { ...prev, likes_count: prev.likes_count + 1 } : null);
        }
        // Invalidate query to refresh likes count
        queryClient.invalidateQueries({ queryKey: ["community-colorings"] });
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLikingColoring(null);
    }
  };

  // Lazy load canvas_data for editing
  const handleEdit = async () => {
    if (!selectedColoring || !onSelectColoring) return;
    
    // Fetch canvas_data only when needed
    const { data, error } = await supabase
      .from("user_colorings")
      .select("canvas_data")
      .eq("id", selectedColoring.id)
      .single();
    
    if (error || !data?.canvas_data) {
      toast.error("Failed to load coloring data");
      return;
    }
    
    const pageWithSavedData = {
      ...selectedColoring.coloring_page,
      savedCanvasData: data.canvas_data,
      isPublic: selectedColoring.is_public,
    };
    onSelectColoring(pageWithSavedData, true);
    setSelectedColoring(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (colorings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-2">No shared colorings yet!</p>
        <p className="text-sm text-muted-foreground">
          Be the first to share your artwork with the community.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {colorings.map((coloring) => {
          const isLiked = userLikes.has(coloring.id);
          const isOwn = coloring.user_id === userId;

          return (
            <Card 
              key={coloring.id} 
              className="overflow-hidden group cursor-pointer"
              onClick={() => setSelectedColoring(coloring)}
            >
              <CardContent className="p-0 relative">
                {/* Image with lazy loading */}
                <div className="aspect-square relative">
                  {coloring.thumbnail_url ? (
                    <LazyImage
                      src={coloring.thumbnail_url}
                      alt={coloring.page_title || "Coloring"}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <span className="text-4xl">🎨</span>
                    </div>
                  )}

                  {/* Own badge */}
                  {isOwn && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      Yours
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm truncate">{coloring.page_title || "Coloring"}</h3>
                    {coloring.creator_name && (
                      <p className="text-xs text-muted-foreground truncate">by {coloring.creator_name}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(coloring.id);
                    }}
                    disabled={likingColoring === coloring.id}
                    className="flex items-center gap-1 px-2 py-1 -mr-1 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <Heart className={cn("h-4 w-4", isLiked && "fill-red-500 text-red-500")} />
                    <span className="text-xs text-muted-foreground">{coloring.likes_count}</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedColoring} onOpenChange={() => setSelectedColoring(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden mt-8">
          {selectedColoring && (
            <div className="relative pt-6">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setSelectedColoring(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              
              {selectedColoring.thumbnail_url ? (
                <img
                  src={selectedColoring.thumbnail_url}
                  alt={selectedColoring.page_title || "Coloring"}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              ) : (
                <div className="w-full aspect-square bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <span className="text-8xl">🎨</span>
                </div>
              )}
              
              <div className="p-4 bg-background">
                <h2 className="text-xl font-semibold">{selectedColoring.page_title || "Coloring"}</h2>
                {selectedColoring.creator_name && (
                  <p className="text-sm text-muted-foreground">by {selectedColoring.creator_name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Created {format(new Date(selectedColoring.created_at), "MMM d, yyyy")}
                  {selectedColoring.updated_at && 
                   new Date(selectedColoring.updated_at).getTime() - new Date(selectedColoring.created_at).getTime() > 60000 && (
                    <> · Updated {format(new Date(selectedColoring.updated_at), "MMM d, yyyy")}</>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleLike(selectedColoring.id)}
                    disabled={likingColoring === selectedColoring.id}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4 mr-1",
                        userLikes.has(selectedColoring.id) && "fill-red-500 text-red-500"
                      )}
                    />
                    {selectedColoring.likes_count}
                  </Button>
                  {/* Edit button - only for owner */}
                  {onSelectColoring && selectedColoring.coloring_page && selectedColoring.user_id === userId && (
                    <Button
                      size="sm"
                      onClick={handleEdit}
                    >
                      <Palette className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  {/* Color This Template - for everyone */}
                  {onSelectColoring && selectedColoring.coloring_page && (
                    <Button
                      variant={selectedColoring.user_id === userId ? "outline" : "default"}
                      size="sm"
                      onClick={() => {
                        onSelectColoring(selectedColoring.coloring_page, false);
                        setSelectedColoring(null);
                      }}
                    >
                      <Palette className="h-4 w-4 mr-1" />
                      Start New Copy
                    </Button>
                  )}
                  {selectedColoring.user_id === userId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setUnsharing(true);
                        try {
                          const { error } = await supabase
                            .from("user_colorings")
                            .update({ is_public: false })
                            .eq("id", selectedColoring.id);
                          if (error) throw error;
                          queryClient.invalidateQueries({ queryKey: ["community-colorings"] });
                          setSelectedColoring(null);
                          toast.success("Drawing unshared - now private");
                        } catch (error: any) {
                          toast.error(error.message);
                        } finally {
                          setUnsharing(false);
                        }
                      }}
                      disabled={unsharing}
                    >
                      {unsharing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <EyeOff className="h-4 w-4 mr-1" />}
                      Unshare
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
