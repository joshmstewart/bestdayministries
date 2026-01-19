import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToastWithCopy } from '@/lib/errorToast';
import { SoundConfig } from './InstrumentSlot';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface BeatCoverImageProps {
  beatId?: string;
  beatName: string;
  imageUrl?: string | null;
  pattern: Record<string, boolean[]>;
  tempo: number;
  instruments: (SoundConfig | null)[];
  onImageGenerated?: (url: string) => void;
  className?: string;
}

export const BeatCoverImage: React.FC<BeatCoverImageProps> = ({
  beatId,
  beatName,
  imageUrl,
  pattern,
  tempo,
  instruments,
  onImageGenerated,
  className,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Update when prop changes
  React.useEffect(() => {
    setCurrentImageUrl(imageUrl);
    setImageLoaded(false); // Reset loaded state when URL changes
  }, [imageUrl]);

  const hasPattern = Object.values(pattern).some(steps => steps.some(Boolean));

  const handleGenerateImage = async () => {
    if (!beatId) {
      showErrorToastWithCopy('Generate Cover Art', 'Save your beat first to generate cover art!');
      return;
    }

    if (!hasPattern) {
      showErrorToastWithCopy('Generate Cover Art', 'Add some notes to your beat first!');
      return;
    }

    setIsGenerating(true);
    toast.info('Generating cover art...', { duration: 3000 });

    try {
      // Convert pattern to use sound IDs
      const patternWithIds: Record<string, boolean[]> = {};
      instruments.forEach((sound, idx) => {
        if (sound && pattern[idx.toString()]) {
          patternWithIds[sound.id] = pattern[idx.toString()];
        }
      });

      const instrumentNames = instruments.filter(Boolean).map(i => i!.name);

      const response = await supabase.functions.invoke('generate-beat-image', {
        body: {
          beatId,
          beatName,
          instruments: instrumentNames,
          tempo,
          pattern: patternWithIds,
        },
      });

      if (response.error) throw response.error;

      const newImageUrl =
        response.data?.imageUrl ||
        response.data?.image_url ||
        response.data?.url;

      if (newImageUrl) {
        // Add cache-busting parameter to force browser to load new image
        const cacheBustedUrl = `${newImageUrl}?t=${Date.now()}`;
        setCurrentImageUrl(cacheBustedUrl);
        onImageGenerated?.(cacheBustedUrl); // Pass cache-busted URL so parent state also updates
        toast.success('Cover art generated! 🎨');
      } else {
        console.warn('generate-beat-image returned no image URL', response.data);
        showErrorToastWithCopy('Generate Cover Art', 'Cover art generated but no URL was returned');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      showErrorToastWithCopy('Generate Cover Art', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <label className="text-sm font-medium block">Cover Art</label>
      <div className="relative">
        {currentImageUrl ? (
          <div className="relative group">
            {/* Skeleton placeholder while loading */}
            {!imageLoaded && (
              <Skeleton className="absolute inset-0 w-full aspect-square rounded-xl" />
            )}
            <img
              src={currentImageUrl}
              alt={beatName}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              className={cn(
                "w-full aspect-square object-cover rounded-xl border border-border transition-opacity duration-300",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
            />
            <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateImage}
                disabled={isGenerating || !beatId}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Regenerate
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-square rounded-xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-3">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Music className="h-8 w-8 text-muted-foreground" />
            </div>
            {beatId ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateImage}
                disabled={isGenerating || !hasPattern}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Generate Cover
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground text-center px-4">
                Save your beat to generate AI cover art!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BeatCoverImage;
