import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, Trash2, Share2, Lock, Download, Copy } from "lucide-react";
import { toast } from "sonner";
import { useCoins } from "@/hooks/useCoins";

interface CardGalleryProps {
  onSelectCard: (card: any, startFresh?: boolean, template?: any) => void;
}

export function CardGallery({ onSelectCard }: CardGalleryProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { awardCoins } = useCoins();
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [cardToDelete, setCardToDelete] = useState<any>(null);

  // Fetch user's saved cards with design info
  const { data: cards, isLoading } = useQuery({
    queryKey: ["user-cards", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_cards")
        .select(`
          *,
          template:card_templates(id, title, cover_image_url),
          design:card_designs(id, title, image_url, template_id)
        `)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Toggle share mutation
  const toggleShareMutation = useMutation({
    mutationFn: async ({ cardId, isPublic }: { cardId: string; isPublic: boolean }) => {
      const { error } = await supabase
        .from("user_cards")
        .update({ is_public: isPublic })
        .eq("id", cardId);
      if (error) throw error;
      
      // Award coins on first share
      if (isPublic && user?.id) {
        await awardCoins(user.id, 5, 'Shared a card with the community');
      }
    },
    onSuccess: (_, { isPublic }) => {
      queryClient.invalidateQueries({ queryKey: ["user-cards"] });
      toast.success(isPublic ? "Card shared! +5 coins" : "Card is now private");
      setSelectedCard(null);
    },
    onError: () => {
      toast.error("Failed to update sharing");
    },
  });

  const handleDeleteClick = (card: any) => {
    setCardToDelete(card);
    setSelectedCard(null);
  };

  const handleConfirmDelete = async () => {
    if (!cardToDelete) return;
    
    try {
      const { error } = await supabase
        .from("user_cards")
        .delete()
        .eq("id", cardToDelete.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["user-cards"] });
      toast.success("Card deleted");
    } catch (error) {
      toast.error("Failed to delete card");
    } finally {
      setCardToDelete(null);
    }
  };

  const handleContinueEditing = () => {
    if (selectedCard) {
      // Get the template from design if available
      const template = selectedCard.design?.template_id ? {
        id: selectedCard.template?.id || selectedCard.design.template_id,
        title: selectedCard.template?.title || "Card Pack",
        cover_image_url: selectedCard.template?.cover_image_url || "",
      } : null;
      
      onSelectCard(selectedCard, false, template);
      setSelectedCard(null);
    }
  };

  const handleStartFresh = () => {
    if (selectedCard) {
      const template = selectedCard.design?.template_id ? {
        id: selectedCard.template?.id || selectedCard.design.template_id,
        title: selectedCard.template?.title || "Card Pack",
        cover_image_url: selectedCard.template?.cover_image_url || "",
      } : null;
      
      onSelectCard(selectedCard, true, template);
      setSelectedCard(null);
    }
  };

  const handleDownload = async (card: any) => {
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

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please sign in to see your saved cards.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading your cards...</div>;
  }

  if (!cards?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          You haven't created any cards yet. Pick a card pack to get started!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
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
                {card.is_public && (
                  <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded">
                    Shared
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm truncate">{card.title || "Untitled Card"}</h3>
                <p className="text-xs text-muted-foreground">
                  {card.design?.title || card.template?.title || "Custom Card"}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Card preview dialog */}
      <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCard?.title || "Untitled Card"}</DialogTitle>
            <DialogDescription>
              {selectedCard?.design?.title || selectedCard?.template?.title || "Custom card"}
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
          
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(selectedCard)}
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleShareMutation.mutate({
                cardId: selectedCard.id,
                isPublic: !selectedCard.is_public,
              })}
            >
              {selectedCard?.is_public ? (
                <>
                  <Lock className="w-4 h-4 mr-1" />
                  Make Private
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleStartFresh}
            >
              <Copy className="w-4 h-4 mr-1" />
              Start New Copy
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleContinueEditing}
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteClick(selectedCard)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!cardToDelete} onOpenChange={(open) => !open && setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Card?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{cardToDelete?.title || 'this card'}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
