import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { 
  Image as ImageIcon, 
  Sticker, 
  Trash2, 
  Share2, 
  Download, 
  Check,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCw
} from "lucide-react";
import { useMonthlyChallenge, StickerElement } from "@/hooks/useMonthlyChallenge";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";

interface SceneBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function SceneBuilder({ open, onOpenChange, userId }: SceneBuilderProps) {
  const {
    theme,
    progress,
    unplacedStickerCount,
    selectBackground,
    placeSticker,
    updateStickerPosition,
    removeSticker,
    completeChallenge,
  } = useMonthlyChallenge(userId);

  const [selectedSticker, setSelectedSticker] = useState<StickerElement | null>(null);
  const [selectedPlacedIndex, setSelectedPlacedIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  if (!theme || !progress) return null;

  const selectedBackground = theme.background_options.find(
    bg => bg.id === progress.selected_background
  );

  // Group stickers by category
  const stickersByCategory = theme.sticker_elements.reduce((acc, sticker) => {
    const category = sticker.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(sticker);
    return acc;
  }, {} as Record<string, StickerElement[]>);

  const handleCanvasClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedSticker || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const success = await placeSticker(selectedSticker, x, y);
    if (success) {
      setSelectedSticker(null);
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight }
      });
    }
  };

  const handleStickerMouseDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPlacedIndex(index);
    setIsDragging(true);

    const sticker = progress.placed_stickers[index];
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const stickerX = (sticker.x / 100) * rect.width;
      const stickerY = (sticker.y / 100) * rect.height;
      setDragOffset({
        x: e.clientX - rect.left - stickerX,
        y: e.clientY - rect.top - stickerY
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || selectedPlacedIndex === null || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;

    // Clamp to canvas bounds
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    updateStickerPosition(selectedPlacedIndex, clampedX, clampedY);
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const adjustStickerScale = (delta: number) => {
    if (selectedPlacedIndex === null) return;
    const sticker = progress.placed_stickers[selectedPlacedIndex];
    const newScale = Math.max(0.5, Math.min(2, sticker.scale + delta));
    updateStickerPosition(selectedPlacedIndex, sticker.x, sticker.y, newScale);
  };

  const rotateSticker = () => {
    if (selectedPlacedIndex === null) return;
    const sticker = progress.placed_stickers[selectedPlacedIndex];
    const newRotation = (sticker.rotation + 15) % 360;
    updateStickerPosition(selectedPlacedIndex, sticker.x, sticker.y, sticker.scale, newRotation);
  };

  const handleShare = async () => {
    if (!progress.is_completed) {
      // Check if they've met the days requirement
      if (progress.completion_days >= theme.days_required) {
        await completeChallenge();
      } else {
        toast.error(`Complete ${theme.days_required - progress.completion_days} more days to share!`);
        return;
      }
    }

    // For now, just show a success message - in future, render canvas to image and share
    toast.success('Sharing feature coming soon! Your creation is saved.');
  };

  const canComplete = progress.completion_days >= theme.days_required && !progress.is_completed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{theme.badge_icon}</span>
            {theme.name}
            {progress.is_completed && (
              <Badge className="bg-green-500">Complete!</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {unplacedStickerCount > 0 
              ? `You have ${unplacedStickerCount} sticker${unplacedStickerCount !== 1 ? 's' : ''} to place!` 
              : 'Complete your daily chores to earn more stickers!'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Canvas area */}
          <div className="flex-1 flex flex-col">
            <div 
              ref={canvasRef}
              className={`relative aspect-[4/3] rounded-lg border-2 overflow-hidden ${
                selectedSticker ? 'cursor-crosshair border-primary' : 'border-border'
              } ${selectedBackground ? '' : 'bg-muted'}`}
              style={{
                backgroundImage: selectedBackground ? `url(${selectedBackground.image_url})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            >
              {!selectedBackground && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Select a background to start</p>
                  </div>
                </div>
              )}

              {/* Placed stickers */}
              {progress.placed_stickers.map((placed, index) => {
                const stickerDef = theme.sticker_elements.find(s => s.id === placed.sticker_id);
                if (!stickerDef) return null;

                return (
                  <div
                    key={index}
                    className={`absolute cursor-move select-none transition-shadow ${
                      selectedPlacedIndex === index ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}
                    style={{
                      left: `${placed.x}%`,
                      top: `${placed.y}%`,
                      transform: `translate(-50%, -50%) scale(${placed.scale}) rotate(${placed.rotation}deg)`,
                    }}
                    onMouseDown={(e) => handleStickerMouseDown(index, e)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlacedIndex(index === selectedPlacedIndex ? null : index);
                    }}
                  >
                    <img 
                      src={stickerDef.image_url} 
                      alt={stickerDef.name}
                      className="w-16 h-16 object-contain pointer-events-none"
                      draggable={false}
                    />
                  </div>
                );
              })}

              {/* Selection hint */}
              {selectedSticker && (
                <div className="absolute bottom-2 left-2 right-2 bg-primary/90 text-primary-foreground px-3 py-2 rounded-lg text-sm text-center">
                  Click anywhere to place {selectedSticker.name}
                </div>
              )}
            </div>

            {/* Sticker controls */}
            {selectedPlacedIndex !== null && (
              <div className="flex items-center justify-center gap-2 mt-2 p-2 bg-muted rounded-lg">
                <Button size="sm" variant="outline" onClick={() => adjustStickerScale(-0.1)}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => adjustStickerScale(0.1)}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={rotateSticker}>
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => {
                    removeSticker(selectedPlacedIndex);
                    setSelectedPlacedIndex(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => setSelectedPlacedIndex(null)}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-64 flex flex-col min-h-0">
            <Tabs defaultValue="backgrounds" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="backgrounds" className="gap-1">
                  <ImageIcon className="h-4 w-4" />
                  BG
                </TabsTrigger>
                <TabsTrigger value="stickers" className="gap-1">
                  <Sticker className="h-4 w-4" />
                  Stickers
                  {unplacedStickerCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-5 p-0 flex items-center justify-center">
                      {unplacedStickerCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="backgrounds" className="flex-1 min-h-0 mt-2">
                <ScrollArea className="h-full">
                  <div className="grid grid-cols-2 gap-2 p-1">
                    {theme.background_options.map((bg) => (
                      <Card
                        key={bg.id}
                        className={`cursor-pointer overflow-hidden transition-all ${
                          progress.selected_background === bg.id 
                            ? 'ring-2 ring-primary' 
                            : 'hover:ring-1 ring-border'
                        }`}
                        onClick={() => selectBackground(bg.id)}
                      >
                        <div className="aspect-[4/3] relative">
                          <img 
                            src={bg.image_url} 
                            alt={bg.name}
                            className="w-full h-full object-cover"
                          />
                          {progress.selected_background === bg.id && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Check className="h-6 w-6 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="p-1 text-xs text-center truncate">
                          {bg.name}
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="stickers" className="flex-1 min-h-0 mt-2">
                <ScrollArea className="h-full">
                  <div className="space-y-4 p-1">
                    {Object.entries(stickersByCategory).map(([category, stickers]) => (
                      <div key={category}>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase">
                          {category}
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          {stickers.map((sticker) => (
                            <Card
                              key={sticker.id}
                              className={`cursor-pointer p-2 transition-all ${
                                selectedSticker?.id === sticker.id
                                  ? 'ring-2 ring-primary bg-primary/10'
                                  : unplacedStickerCount > 0 
                                    ? 'hover:ring-1 ring-border' 
                                    : 'opacity-50 cursor-not-allowed'
                              }`}
                              onClick={() => {
                                if (unplacedStickerCount > 0) {
                                  setSelectedSticker(
                                    selectedSticker?.id === sticker.id ? null : sticker
                                  );
                                } else {
                                  toast.info('Complete more daily chores to earn stickers!');
                                }
                              }}
                            >
                              <img 
                                src={sticker.image_url} 
                                alt={sticker.name}
                                className="w-full aspect-square object-contain"
                              />
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="mt-4 space-y-2">
              {canComplete && (
                <Button className="w-full" onClick={completeChallenge}>
                  <Sticker className="h-4 w-4 mr-2" />
                  Complete Challenge!
                </Button>
              )}
              <Button 
                variant={progress.is_completed ? "default" : "outline"} 
                className="w-full"
                onClick={handleShare}
                disabled={!progress.is_completed && progress.completion_days < theme.days_required}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Creation
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
