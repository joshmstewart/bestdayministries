import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Heart, Download } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface CardCommunityGalleryProps {
  userId: string;
}

export function CardCommunityGallery({ userId }: CardCommunityGalleryProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedCard, setSelectedCard] = useState<any>(null);

  // Fetch public cards
  const { data: publicCards, isLoading } = useQuery({
    queryKey: ["public-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_cards")
        .select(`
          *,
          template:card_templates(title)
        `)
        .eq("is_public", true)
        .order("likes_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's likes
  const { data: userLikes } = useQuery({
    queryKey: ["card-likes", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("card_likes")
        .select("card_id")
        .eq("user_id", userId);
      if (error) throw error;
      return new Set(data.map(l => l.card_id));
    },
    enabled: !!userId,
  });

  // Like/unlike mutation
  const likeMutation = useMutation({
    mutationFn: async ({ cardId, isLiked }: { cardId: string; isLiked: boolean }) => {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from("card_likes")
          .delete()
          .eq("card_id", cardId)
          .eq("user_id", userId);
        if (error) throw error;
        
        // Decrement likes count
        await supabase.rpc('increment', { 
          row_id: cardId, 
          table_name: 'user_cards', 
          amount: -1 
        }).catch(() => {
          // Fallback: manual update
          supabase
            .from("user_cards")
            .update({ likes_count: (selectedCard?.likes_count || 1) - 1 })
            .eq("id", cardId);
        });
      } else {
        // Like
        const { error } = await supabase
          .from("card_likes")
          .insert({ card_id: cardId, user_id: userId });
        if (error) throw error;
        
        // Increment likes count
        await supabase.rpc('increment', { 
          row_id: cardId, 
          table_name: 'user_cards', 
          amount: 1 
        }).catch(() => {
          // Fallback: manual update
          supabase
            .from("user_cards")
            .update({ likes_count: (selectedCard?.likes_count || 0) + 1 })
            .eq("id", cardId);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-cards"] });
      queryClient.invalidateQueries({ queryKey: ["card-likes"] });
    },
    onError: () => {
      toast.error("Failed to update like");
    },
  });

  const handleLike = (card: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Please sign in to like cards");
      return;
    }
    const isLiked = userLikes?.has(card.id);
    likeMutation.mutate({ cardId: card.id, isLiked: !!isLiked });
  };

  const handleDownload = async (card: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!card.thumbnail_url) {
      toast.error("No image available");
      return;
    }
    
    try {
      const response = await fetch(card.thumbnail_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = `${card.title || 'card'}.png`;
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success("Card downloaded!");
    } catch (error) {
      toast.error("Failed to download");
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading community cards...</div>;
  }

  if (!publicCards?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No shared cards yet. Be the first to share one!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {publicCards.map((card) => {
          const isLiked = userLikes?.has(card.id);
          return (
            <Card
              key={card.id}
              className="cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden group"
              onClick={() => setSelectedCard(card)}
            >
              <CardContent className="p-0">
                <div className="relative aspect-[5/7]">
                  {card.thumbnail_url ? (
                    <img
                      src={card.thumbnail_url}
                      alt={card.title || "Card"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">No preview</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => handleLike(card, e)}
                    className={`absolute top-2 right-2 p-1.5 rounded-full transition-colors ${
                      isLiked 
                        ? "bg-red-500 text-white" 
                        : "bg-black/50 text-white hover:bg-red-500"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                  </button>
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm truncate">{card.title || "Untitled Card"}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      {card.template?.title || "Custom Card"}
                    </p>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Heart className="w-3 h-3" />
                      {card.likes_count || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Card detail dialog */}
      <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCard?.title || "Untitled Card"}</DialogTitle>
            <DialogDescription>
              {selectedCard?.template?.title || "Custom card"} • {selectedCard?.likes_count || 0} likes
            </DialogDescription>
          </DialogHeader>
          
          {selectedCard?.thumbnail_url && (
            <div className="rounded-lg overflow-hidden border">
              <img
                src={selectedCard.thumbnail_url}
                alt={selectedCard.title}
                className="w-full h-auto"
              />
            </div>
          )}
          
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => handleDownload(selectedCard)}
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
            
            <Button
              variant={userLikes?.has(selectedCard?.id) ? "default" : "outline"}
              onClick={(e) => {
                handleLike(selectedCard, e);
                setSelectedCard(null);
              }}
            >
              <Heart className={`w-4 h-4 mr-1 ${userLikes?.has(selectedCard?.id) ? "fill-current" : ""}`} />
              {userLikes?.has(selectedCard?.id) ? "Liked" : "Like"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
