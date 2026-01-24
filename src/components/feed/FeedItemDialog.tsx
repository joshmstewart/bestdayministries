import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { 
  Download, Loader2, X, Lock, Play, Square, 
  Palette, Music, Activity, User, MapPin, Package
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
import { LikeButtonWithTooltip } from "./LikeButtonWithTooltip";

interface IngredientWithCategory {
  name: string;
  category: string;
}

interface BeatInstrument {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

// Helper to count active steps in a beat pattern
const countBeatNotes = (pattern: Record<string, boolean[]>): number => {
  if (!pattern || typeof pattern !== 'object') return 0;
  return Object.values(pattern).reduce((total, steps) => {
    if (Array.isArray(steps)) {
      return total + steps.filter(Boolean).length;
    }
    return total;
  }, 0);
};

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
  const [drinkIngredients, setDrinkIngredients] = useState<IngredientWithCategory[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [beatInstruments, setBeatInstruments] = useState<BeatInstrument[]>([]);
  const [loadingBeatInstruments, setLoadingBeatInstruments] = useState(false);
  const { playBeat, stopBeat, isPlaying } = useBeatLoopPlayer();

  // Fetch drink ingredients when a drink item is opened
  useEffect(() => {
    const fetchDrinkIngredients = async () => {
      if (!item || item.item_type !== 'drink' || !isOpen) {
        setDrinkIngredients([]);
        return;
      }

      setLoadingIngredients(true);
      try {
        // First, get the drink's ingredient IDs
        const { data: drink } = await supabase
          .from('custom_drinks')
          .select('ingredients')
          .eq('id', item.id)
          .single();

        if (drink?.ingredients && drink.ingredients.length > 0) {
          // Then fetch the ingredient details
          const { data: ingredients } = await supabase
            .from('drink_ingredients')
            .select('id, name, category')
            .in('id', drink.ingredients);

          if (ingredients) {
            setDrinkIngredients(
              ingredients.map(i => ({ name: i.name, category: i.category }))
            );
          }
        }
      } catch (error) {
        console.error('Error fetching drink ingredients:', error);
      } finally {
        setLoadingIngredients(false);
      }
    };

    fetchDrinkIngredients();
  }, [item?.id, item?.item_type, isOpen]);

  // Fetch beat instruments when a beat item is opened
  useEffect(() => {
    const fetchBeatInstruments = async () => {
      if (!item || item.item_type !== 'beat' || !isOpen || !item.extra_data?.pattern) {
        setBeatInstruments([]);
        return;
      }

      setLoadingBeatInstruments(true);
      try {
        const pattern = item.extra_data.pattern as Record<string, boolean[]>;
        const instrumentKeys = Object.keys(pattern);
        
        if (instrumentKeys.length === 0) {
          setBeatInstruments([]);
          return;
        }

        // Check if keys are UUIDs or sound_type strings
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const firstKey = instrumentKeys[0];
        
        let query;
        if (isUUID.test(firstKey)) {
          // Keys are UUIDs
          query = supabase
            .from('beat_pad_sounds')
            .select('id, name, emoji, color')
            .in('id', instrumentKeys);
        } else {
          // Keys are sound_type strings (legacy)
          query = supabase
            .from('beat_pad_sounds')
            .select('id, name, emoji, color, sound_type')
            .in('sound_type', instrumentKeys);
        }
        
        const { data: sounds } = await query;
        
        if (sounds) {
          setBeatInstruments(sounds.map(s => ({
            id: s.id,
            name: s.name,
            emoji: s.emoji,
            color: s.color
          })));
        }
      } catch (error) {
        console.error('Error fetching beat instruments:', error);
      } finally {
        setLoadingBeatInstruments(false);
      }
    };

    fetchBeatInstruments();
  }, [item?.id, item?.item_type, isOpen, item?.extra_data?.pattern]);

  if (!item) return null;

  const isOwner = user?.id === item.author_id;
  const isBeatPlaying = item.item_type === 'beat' && isPlaying(item.id);

  const getItemRoute = () => {
    const params = new URLSearchParams();
    params.set(idParam, item.id);
    // Don't set tab=community - let items open to their app's default first tab
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

  const handlePlayBeat = () => {
    if (item.item_type !== 'beat' || !item.extra_data?.pattern) return;
    
    if (isPlaying(item.id)) {
      stopBeat();
    } else {
      playBeat(item.id, item.extra_data.pattern, item.extra_data.tempo || 120);
    }
  };

  // Group drink ingredients by category for display
  const groupedIngredients = drinkIngredients.reduce((acc, ing) => {
    const cat = ing.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ing.name);
    return acc;
  }, {} as Record<string, string[]>);

  const categoryLabels: Record<string, string> = {
    base: 'Base',
    milk: 'Milk',
    flavor: 'Flavors',
    topping: 'Toppings',
    other: 'Other',
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-2xl p-0 max-h-[90vh] overflow-hidden" 
        hideCloseButton
        aria-describedby={undefined}
      >
        <div className="overflow-y-auto max-h-[90vh] -webkit-overflow-scrolling-touch">
          {/* Close button - top right of card */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
            onClick={onClose}
            title="Close"
          >
            <X className="h-5 w-5" />
          </Button>
          
          {/* Image */}
          {item.image_url ? (
            <div className="relative pt-4">
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-auto max-h-[60vh] object-contain"
              />
              {/* Beat play overlay */}
              {item.item_type === 'beat' && item.extra_data?.pattern && (
                <button
                  onClick={handlePlayBeat}
                  className="absolute inset-0 top-4 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
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
            <div className="w-full aspect-square bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mt-4">
              <span className="text-8xl">🎨</span>
            </div>
          )}
          
          {/* Info panel */}
          <div className="p-4 bg-background">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold truncate">{item.title}</h2>
              <TextToSpeech 
                text={
                  item.item_type === 'drink' && drinkIngredients.length > 0
                    ? `${item.title}. ${item.description || ''} Made with ${drinkIngredients.map(i => i.name).join(', ')}.`
                    : `${item.title}${item.description ? `. ${item.description}` : ''}`
                }
                size="sm"
              />
            </div>
            {item.author_name && (
              <p className="text-sm text-muted-foreground">by {item.author_name}</p>
            )}
            
            {/* Beat stats: BPM, notes, plays */}
            {item.item_type === 'beat' && item.extra_data && (
              <p className="text-sm text-muted-foreground mt-1">
                {item.extra_data.tempo && <span className="font-medium">{item.extra_data.tempo} BPM</span>}
                {item.extra_data.tempo && item.extra_data.pattern && <span className="mx-2">•</span>}
                {item.extra_data.pattern && (
                  <span>{countBeatNotes(item.extra_data.pattern)} notes • {item.extra_data.plays_count || 0} loop plays</span>
                )}
              </p>
            )}
            
            {item.item_type !== 'beat' && item.item_type !== 'workout' && (
              <p className="text-xs text-muted-foreground mt-1">
                Created {format(new Date(item.created_at), "MMM d, yyyy")}
              </p>
            )}
            {item.description && item.item_type !== 'beat' && item.item_type !== 'workout' && (
              <p className="text-sm text-muted-foreground mt-2 italic">{item.description}</p>
            )}

            {/* Workout Details */}
            {item.item_type === 'workout' && item.extra_data && (
              <>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(item.created_at), "EEEE, MMMM d, yyyy")}
                </p>
                <div className="space-y-2 pt-3 mt-3 border-t border-border">
                  {item.extra_data.activity_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span>{item.extra_data.activity_name}</span>
                    </div>
                  )}
                  {item.extra_data.avatar_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{item.extra_data.avatar_name}</span>
                    </div>
                  )}
                  {item.extra_data.location_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{item.extra_data.location_name}</span>
                    </div>
                  )}
                  {item.extra_data.location_pack_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{item.extra_data.location_pack_name}</span>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Drink Ingredients - organized by category */}
            {item.item_type === 'drink' && drinkIngredients.length > 0 && (
              <div className="space-y-3 mt-4">
                <h3 className="text-sm font-medium">Ingredients</h3>
                {loadingIngredients ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading ingredients...
                  </div>
                ) : (
                  Object.entries(groupedIngredients).map(([category, items]) => (
                    <div key={category}>
                      <p className="text-xs text-muted-foreground mb-1.5">{categoryLabels[category] || category}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((name, idx) => (
                          <span 
                            key={idx}
                            className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Beat Instruments - compact grid layout */}
            {item.item_type === 'beat' && beatInstruments.length > 0 && (
              <div className="space-y-2 mt-4">
                <h3 className="text-sm font-medium">Instruments Used ({beatInstruments.length})</h3>
                {loadingBeatInstruments ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading instruments...
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {beatInstruments.map((instrument) => (
                      <div 
                        key={instrument.id}
                        className="flex items-center gap-2 px-2 py-1 rounded-full bg-muted/50"
                        title={instrument.name}
                      >
                        <span 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0"
                          style={{ backgroundColor: instrument.color }}
                        >
                          {instrument.emoji}
                        </span>
                        <span className="text-xs font-medium truncate max-w-[100px]">{instrument.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recipe Ingredients and Steps */}
            {item.item_type === 'recipe' && item.extra_data && (
              <div className="space-y-4 mt-4">
                {/* Recipe Ingredients */}
                {item.extra_data.ingredients && item.extra_data.ingredients.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Ingredients</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {item.extra_data.ingredients.map((ingredient: string, idx: number) => (
                        <span 
                          key={idx}
                          className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                        >
                          {ingredient}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Recipe Steps */}
                {item.extra_data.steps && item.extra_data.steps.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Steps</h3>
                    <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
                      {item.extra_data.steps.map((step: string, idx: number) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

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

              {/* Like button with tooltip */}
              <LikeButtonWithTooltip
                itemId={item.id}
                itemType={item.item_type}
                isLiked={isLiked}
                likesCount={likesCount}
                onLike={onToggleLike}
              />


              {/* Owner-only actions */}
              {isOwner && (
                <>
                  {/* Edit - owner only */}
                  <Button variant="default" size="sm" asChild>
                    <Link to={getItemRoute()}>
                      <Palette className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                  </Button>

                  {/* Download - owner only, not for colorings */}
                  {item.image_url && item.item_type !== 'coloring' && (
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
                </>
              )}

              {/* Start New Copy - for applicable types (everyone can copy) */}
              {(item.item_type === 'coloring' || item.item_type === 'beat' || item.item_type === 'card') && (
                <Button variant={isOwner ? "outline" : "default"} size="sm" asChild>
                  <Link to={getItemRoute() + "&action=copy"}>
                    {item.item_type === 'beat' ? (
                      <>
                        <Music className="h-4 w-4 mr-1" />
                        {isOwner ? "Remix" : "Start New Copy"}
                      </>
                    ) : (
                      <>
                        <Palette className="h-4 w-4 mr-1" />
                        Start New Copy
                      </>
                    )}
                  </Link>
                </Button>
              )}

              {/* Unshare - owner only */}
              {isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnshare}
                  disabled={unsharing}
                >
                  {unsharing ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4 mr-1" />
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
