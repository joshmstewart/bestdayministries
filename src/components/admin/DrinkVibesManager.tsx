import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Vibe {
  id: string;
  name: string;
  description: string;
  atmosphere_hint: string;
  emoji: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

export const DrinkVibesManager = () => {
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentVibe, setCurrentVibe] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  useEffect(() => {
    loadVibes();
  }, []);

  const loadVibes = async () => {
    const { data, error } = await supabase
      .from("drink_vibes")
      .select("*")
      .order("display_order");

    if (error) {
      console.error("Error loading vibes:", error);
      toast.error("Failed to load vibes");
    } else {
      // Add cache-busting to image URLs to ensure fresh images are displayed
      const vibesWithCacheBust = (data || []).map(vibe => ({
        ...vibe,
        image_url: vibe.image_url ? `${vibe.image_url.split('?')[0]}?t=${Date.now()}` : null
      }));
      setVibes(vibesWithCacheBust);
    }
    setLoading(false);
  };

  const generateIcon = async (vibe: Vibe): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-vibe-icon", {
        body: {
          vibeId: vibe.id,
          vibeName: vibe.name,
          atmosphereHint: vibe.atmosphere_hint,
        },
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error generating icon for ${vibe.name}:`, error);
      return false;
    }
  };

  const handleGenerateMissing = async () => {
    const vibesWithoutIcons = vibes.filter((v) => !v.image_url);
    if (vibesWithoutIcons.length === 0) {
      toast.info("All vibes already have icons!");
      return;
    }

    setGenerating(true);
    setProgress(0);

    let successCount = 0;
    for (let i = 0; i < vibesWithoutIcons.length; i++) {
      const vibe = vibesWithoutIcons[i];
      setCurrentVibe(vibe.name);
      setProgress(((i + 1) / vibesWithoutIcons.length) * 100);

      const success = await generateIcon(vibe);
      if (success) successCount++;

      // Small delay between requests to avoid rate limiting
      if (i < vibesWithoutIcons.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    setGenerating(false);
    setCurrentVibe(null);
    await loadVibes();

    toast.success(`Generated ${successCount}/${vibesWithoutIcons.length} vibe icons`);
  };

  const handleRegenerate = async (vibe: Vibe) => {
    setRegenerating(vibe.id);

    // Clear existing icon first
    await supabase
      .from("drink_vibes")
      .update({ image_url: null })
      .eq("id", vibe.id);

    const success = await generateIcon(vibe);
    
    if (success) {
      toast.success(`Regenerated icon for ${vibe.name}`);
      await loadVibes();
    } else {
      toast.error(`Failed to regenerate icon for ${vibe.name}`);
    }

    setRegenerating(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const vibesWithoutIcons = vibes.filter((v) => !v.image_url);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Vibe Icons</span>
            <Button
              onClick={handleGenerateMissing}
              disabled={generating || vibesWithoutIcons.length === 0}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Missing Icons ({vibesWithoutIcons.length})
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {generating && (
            <div className="mb-6 space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Generating icon for: {currentVibe}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {vibes.map((vibe) => (
              <div
                key={vibe.id}
                className="group relative flex flex-col items-center p-3 border rounded-lg hover:border-primary transition-colors"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center mb-2 relative">
                  {vibe.image_url ? (
                    <img
                      src={vibe.image_url}
                      alt={vibe.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">{vibe.emoji || "✨"}</span>
                  )}
                  
                  {/* Regenerate button overlay */}
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity bg-background/80"
                    onClick={() => handleRegenerate(vibe)}
                    disabled={regenerating === vibe.id}
                  >
                    {regenerating === vibe.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                <span className="text-xs text-center font-medium truncate w-full">
                  {vibe.name}
                </span>
                {!vibe.image_url && (
                  <span className="text-xs text-muted-foreground">No icon</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
