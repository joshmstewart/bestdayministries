import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Heart, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface CustomDrink {
  id: string;
  name: string;
  generated_image_url: string | null;
  likes_count: number;
  created_at: string;
  creator_id: string;
  creator_name: string | null;
}

interface DrinkGalleryProps {
  userId: string;
}

export const DrinkGallery = ({ userId }: DrinkGalleryProps) => {
  const { toast } = useToast();
  const [drinks, setDrinks] = useState<CustomDrink[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [likingDrink, setLikingDrink] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedDrink, setSelectedDrink] = useState<CustomDrink | null>(null);

  useEffect(() => {
    loadDrinks();
    loadUserLikes();
  }, [userId, sortBy]);

  const loadDrinks = async () => {
    setLoading(true);
    const query = supabase
      .from("custom_drinks")
      .select("*")
      .eq("is_public", true)
      .limit(50);

    if (sortBy === "newest") {
      query.order("created_at", { ascending: false });
    } else {
      query.order("likes_count", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error loading drinks",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (!data || data.length === 0) {
      setDrinks([]);
      setLoading(false);
      return;
    }

    // Fetch creator names separately
    const creatorIds = [...new Set(data.map((d) => d.creator_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", creatorIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || []);

    const drinksWithCreators = data.map((drink) => ({
      ...drink,
      creator_name: profileMap.get(drink.creator_id) || null,
    }));

    setDrinks(drinksWithCreators);
    setLoading(false);
  };

  const loadUserLikes = async () => {
    const { data } = await supabase
      .from("custom_drink_likes")
      .select("drink_id")
      .eq("user_id", userId);

    if (data) {
      setUserLikes(new Set(data.map((l) => l.drink_id)));
    }
  };

  const toggleLike = async (drinkId: string) => {
    setLikingDrink(drinkId);
    const isLiked = userLikes.has(drinkId);

    try {
      if (isLiked) {
        await supabase
          .from("custom_drink_likes")
          .delete()
          .eq("drink_id", drinkId)
          .eq("user_id", userId);

        setUserLikes((prev) => {
          const next = new Set(prev);
          next.delete(drinkId);
          return next;
        });
        setDrinks((prev) =>
          prev.map((d) =>
            d.id === drinkId ? { ...d, likes_count: d.likes_count - 1 } : d
          )
        );
      } else {
        await supabase.from("custom_drink_likes").insert({
          drink_id: drinkId,
          user_id: userId,
        });

        setUserLikes((prev) => new Set([...prev, drinkId]));
        setDrinks((prev) =>
          prev.map((d) =>
            d.id === drinkId ? { ...d, likes_count: d.likes_count + 1 } : d
          )
        );
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLikingDrink(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (drinks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-2">No drinks created yet!</p>
        <p className="text-sm text-muted-foreground">
          Be the first to create and share a custom drink.
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
      {drinks.map((drink) => {
        const isLiked = userLikes.has(drink.id);
        const isOwn = drink.creator_id === userId;

        return (
          <Card 
            key={drink.id} 
            className="overflow-hidden group cursor-pointer"
            onClick={() => setSelectedDrink(drink)}
          >
            <CardContent className="p-0 relative">
              {/* Image with lazy loading */}
              <div className="aspect-square relative">
                {drink.generated_image_url ? (
                  <LazyImage
                    src={drink.generated_image_url}
                    alt={drink.name}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <span className="text-4xl">☕</span>
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
                  <h3 className="font-medium text-sm truncate">{drink.name}</h3>
                  {drink.creator_name && (
                    <p className="text-xs text-muted-foreground truncate">by {drink.creator_name}</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(drink.id);
                  }}
                  disabled={likingDrink === drink.id}
                  className="flex items-center gap-1 px-2 py-1 -mr-1 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <Heart className={cn("h-4 w-4", isLiked && "fill-red-500 text-red-500")} />
                  <span className="text-xs text-muted-foreground">{drink.likes_count}</span>
                </button>
              </div>
            </CardContent>
          </Card>
        );
      })}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedDrink} onOpenChange={() => setSelectedDrink(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {selectedDrink && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setSelectedDrink(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              
              {selectedDrink.generated_image_url ? (
                <img
                  src={selectedDrink.generated_image_url}
                  alt={selectedDrink.name}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              ) : (
                <div className="w-full aspect-square bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <span className="text-8xl">☕</span>
                </div>
              )}
              
              <div className="p-4 bg-background">
                <h2 className="text-xl font-semibold">{selectedDrink.name}</h2>
                {selectedDrink.creator_name && (
                  <p className="text-sm text-muted-foreground">by {selectedDrink.creator_name}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleLike(selectedDrink.id)}
                    disabled={likingDrink === selectedDrink.id}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4 mr-1",
                        userLikes.has(selectedDrink.id) && "fill-red-500 text-red-500"
                      )}
                    />
                    {selectedDrink.likes_count}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
