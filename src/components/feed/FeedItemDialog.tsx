import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { 
  Heart, Share2, Download, Loader2, X, EyeOff, Copy, Play, Square, 
  ExternalLink, Palette, Music
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBeatLoopPlayer } from "@/hooks/useBeatLoopPlayer";
import { TextToSpeech } from "@/components/TextToSpeech";
import { FeedItemData } from "./FeedItem";

interface FeedItemDialogProps {
  item: FeedItemData | null;
  isOpen: boolean;
  onClose: () => void;
  isLiked: boolean;
  likesCount: number;
  onToggleLike: () => void;
  onUnshare: () => void;
  onRefresh?: () => void;
  routeBase: string;
  idParam: string;
}

export function FeedItemDialog({
  item,
  isOpen,
  onClose,
  isLiked,
  likesCount,
  onToggleLike,
  onUnshare,
  onRefresh,
  routeBase,
  idParam,
}: FeedItemDialogProps) {
  const { user } = useAuth();
  const [unsharing, setUnsharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { playBeat, stopBeat, isPlaying } = useBeatLoopPlayer();

  if (!item) return null;

  const isOwner = user?.id === item.author_id;
  const isBeatPlaying = item.item_type === 'beat' && isPlaying(item.id);

  const getItemRoute = () => {
    const params = new URLSearchParams();
    params.set(idParam, item.id);
    if (item.item_type === "beat" || item.item_type === "coloring" || item.item_type === "card") {
      params.set("tab", "community");
    }
    return `${routeBase}?${params.toString()}`;
  };

  const handleDownload = async () => {
    if (!item.image_url) {
      toast.error("No image available");
      return;
    }
    
    setDownloading(true);
    try {
      const response = await fetch(item.image_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = `${item.title || item.item_type}.png`;
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success("Downloaded!");
    } catch (error) {
      toast.error("Failed to download");
    } finally {
      setDownloading(false);
    }
  };

  const handleUnshare = async () => {
    if (!isOwner) return;
    setUnsharing(true);
    try {
      await onUnshare();
      onClose();
    } finally {
      setUnsharing(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${getItemRoute()}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, url });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  };

  const handlePlayBeat = () => {
    if (item.item_type !== 'beat' || !item.extra_data?.pattern) return;
    
    if (isPlaying(item.id)) {
      stopBeat();
    } else {
      playBeat(item.id, item.extra_data.pattern, item.extra_data.tempo || 120);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden mt-8">
        <div className="relative pt-6">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          
          {/* Image */}
          {item.image_url ? (
            <div className="relative">
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
              {/* Beat play overlay */}
              {item.item_type === 'beat' && item.extra_data?.pattern && (
                <button
                  onClick={handlePlayBeat}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
                >
                  <div className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center",
                    isBeatPlaying ? "bg-primary" : "bg-primary/80"
                  )}>
                    {isBeatPlaying ? (
                      <Square className="h-8 w-8 text-primary-foreground" />
                    ) : (
                      <Play className="h-8 w-8 text-primary-foreground ml-1" />
                    )}
                  </div>
                </button>
              )}
            </div>
          ) : (
            <div className="w-full aspect-square bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <span className="text-8xl">🎨</span>
            </div>
          )}
          
          {/* Info panel */}
          <div className="p-4 bg-background">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold truncate">{item.title}</h2>
                  <TextToSpeech 
                    text={`${item.title}${item.description ? `. ${item.description}` : ''}`} 
                    size="sm"
                  />
                </div>
                {item.author_name && (
                  <p className="text-sm text-muted-foreground">by {item.author_name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Created {format(new Date(item.created_at), "MMM d, yyyy")}
                </p>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {/* Play button for beats */}
              {item.item_type === 'beat' && item.extra_data?.pattern && (
                <Button
                  variant={isBeatPlaying ? "default" : "outline"}
                  size="sm"
                  onClick={handlePlayBeat}
                >
                  {isBeatPlaying ? (
                    <>
                      <Square className="h-4 w-4 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      Play
                    </>
                  )}
                </Button>
              )}

              {/* Like button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleLike}
              >
                <Heart
                  className={cn(
                    "h-4 w-4 mr-1",
                    isLiked && "fill-red-500 text-red-500"
                  )}
                />
                {likesCount}
              </Button>

              {/* Share */}
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>

              {/* Download - for image types */}
              {item.image_url && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Download
                </Button>
              )}

              {/* Open in App link */}
              <Button variant="outline" size="sm" asChild>
                <Link to={getItemRoute()}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open in App
                </Link>
              </Button>

              {/* Copy/Remix - for applicable types */}
              {(item.item_type === 'coloring' || item.item_type === 'beat' || item.item_type === 'card') && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={getItemRoute() + "&action=copy"}>
                    {item.item_type === 'beat' ? (
                      <>
                        <Music className="h-4 w-4 mr-1" />
                        Remix
                      </>
                    ) : (
                      <>
                        <Palette className="h-4 w-4 mr-1" />
                        Make My Copy
                      </>
                    )}
                  </Link>
                </Button>
              )}

              {/* Owner actions */}
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnshare}
                  disabled={unsharing}
                  className="text-destructive hover:text-destructive"
                >
                  {unsharing ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <EyeOff className="h-4 w-4 mr-1" />
                  )}
                  Unshare
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
