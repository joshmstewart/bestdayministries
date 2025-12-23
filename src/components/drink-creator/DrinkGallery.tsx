import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomDrink {
  id: string;
  name: string;
  generated_image_url: string | null;
  likes_count: number;
  created_at: string;
  creator_id: string;
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

  useEffect(() => {
    loadDrinks();
    loadUserLikes();
  }, [userId]);

  const loadDrinks = async () => {
    const { data, error } = await supabase
      .from("custom_drinks")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast({
        title: "Error loading drinks",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setDrinks(data || []);
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
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {drinks.map((drink) => {
        const isLiked = userLikes.has(drink.id);
        const isOwn = drink.creator_id === userId;

        return (
          <Card key={drink.id} className="overflow-hidden group">
            <CardContent className="p-0 relative">
              {/* Image */}
              <div className="aspect-square relative">
                {drink.generated_image_url ? (
                  <img
                    src={drink.generated_image_url}
                    alt={drink.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <span className="text-4xl">☕</span>
                  </div>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleLike(drink.id)}
                    disabled={likingDrink === drink.id}
                    className="text-white hover:text-primary hover:bg-white/20"
                  >
                    <Heart
                      className={cn(
                        "h-6 w-6 transition-all",
                        isLiked && "fill-red-500 text-red-500"
                      )}
                    />
                  </Button>
                </div>

                {/* Own badge */}
                {isOwn && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    Yours
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="font-medium text-sm truncate">{drink.name}</h3>
                <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
                  <Heart className={cn("h-3 w-3", isLiked && "fill-red-500 text-red-500")} />
                  <span>{drink.likes_count}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
