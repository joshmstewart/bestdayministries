import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, Calendar, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface GalleryItem {
  id: string;
  title: string | null;
  image_url: string;
  created_at: string;
  likes_count: number;
  user_id: string;
  theme_id: string;
  theme?: {
    name: string;
    badge_icon: string;
  };
  profile?: {
    display_name: string;
  };
  user_liked?: boolean;
}

interface ChallengeGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChallengeGallery({ open, onOpenChange }: ChallengeGalleryProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);

  useEffect(() => {
    if (open) {
      loadGallery();
    }
  }, [open]);

  const loadGallery = async () => {
    setLoading(true);
    try {
      const { data: galleryData, error } = await supabase
        .from("chore_challenge_gallery")
        .select(`
          id,
          title,
          image_url,
          created_at,
          likes_count,
          user_id,
          theme_id,
          chore_challenge_themes(name, badge_icon)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user profiles
      const userIds = [...new Set((galleryData || []).map((g) => g.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      // Check which items current user has liked
      let userLikes: Set<string> = new Set();
      if (user) {
        const { data: likes } = await supabase
          .from("chore_challenge_gallery_likes")
          .select("gallery_id")
          .eq("user_id", user.id);
        userLikes = new Set(likes?.map((l) => l.gallery_id) || []);
      }

      const enrichedItems: GalleryItem[] = (galleryData || []).map((item) => ({
        ...item,
        theme: item.chore_challenge_themes as { name: string; badge_icon: string } | undefined,
        profile: profileMap.get(item.user_id) as { display_name: string } | undefined,
        user_liked: userLikes.has(item.id),
      }));

      setItems(enrichedItems);
    } catch (error) {
      console.error("Error loading gallery:", error);
      toast.error("Failed to load gallery");
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (item: GalleryItem) => {
    if (!user) {
      toast.error("Please log in to like creations");
      return;
    }

    try {
      if (item.user_liked) {
        // Unlike
        await supabase
          .from("chore_challenge_gallery_likes")
          .delete()
          .eq("gallery_id", item.id)
          .eq("user_id", user.id);

        await supabase
          .from("chore_challenge_gallery")
          .update({ likes_count: Math.max(0, item.likes_count - 1) })
          .eq("id", item.id);

        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, user_liked: false, likes_count: Math.max(0, i.likes_count - 1) }
              : i
          )
        );
      } else {
        // Like
        await supabase.from("chore_challenge_gallery_likes").insert({
          gallery_id: item.id,
          user_id: user.id,
        });

        await supabase
          .from("chore_challenge_gallery")
          .update({ likes_count: item.likes_count + 1 })
          .eq("id", item.id);

        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, user_liked: true, likes_count: i.likes_count + 1 }
              : i
          )
        );
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Community Creations
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[70vh] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No creations shared yet. Be the first!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {items.map((item) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setSelectedImage(item)}
                  >
                    <div className="aspect-square relative">
                      <img
                        src={item.image_url}
                        alt={item.title || "Creation"}
                        className="w-full h-full object-cover"
                      />
                      {item.theme && (
                        <Badge className="absolute top-2 left-2 text-xs">
                          {item.theme.badge_icon} {item.theme.name}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground truncate">
                          {item.profile?.display_name || "Anonymous"}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(item);
                          }}
                        >
                          <Heart
                            className={`h-4 w-4 mr-1 ${
                              item.user_liked ? "fill-red-500 text-red-500" : ""
                            }`}
                          />
                          {item.likes_count}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Full image view */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden" hideCloseButton>
          {selectedImage && (
            <>
              <div className="relative">
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.title || "Creation"}
                  className="w-full"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => setSelectedImage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    {selectedImage.title && (
                      <h3 className="font-medium">{selectedImage.title}</h3>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{selectedImage.profile?.display_name || "Anonymous"}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(selectedImage.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant={selectedImage.user_liked ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleLike(selectedImage)}
                  >
                    <Heart
                      className={`h-4 w-4 mr-1 ${
                        selectedImage.user_liked ? "fill-current" : ""
                      }`}
                    />
                    {selectedImage.likes_count} likes
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
