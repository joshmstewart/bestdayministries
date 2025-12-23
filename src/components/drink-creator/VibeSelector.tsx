import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export interface Vibe {
  id: string;
  name: string;
  emoji: string | null;
  description: string;
  atmosphere_hint: string;
  image_url: string | null;
}

interface VibeSelectorProps {
  selected: string | null;
  onSelect: (vibeId: string | null) => void;
}

export const VibeSelector = ({ selected, onSelect }: VibeSelectorProps) => {
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVibes();
  }, []);

  const loadVibes = async () => {
    const { data, error } = await supabase
      .from("drink_vibes")
      .select("id, name, description, atmosphere_hint, emoji, image_url")
      .eq("is_active", true)
      .order("display_order");

    if (error) {
      console.error("Error loading vibes:", error);
    } else {
      setVibes(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const selectedVibe = vibes.find((v) => v.id === selected);

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-muted-foreground mb-4">
        Optional: Choose a vibe to set the atmosphere, or skip to let AI surprise you!
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {vibes.map((vibe) => (
          <button
            key={vibe.id}
            onClick={() => onSelect(selected === vibe.id ? null : vibe.id)}
            className={cn(
              "relative p-3 rounded-xl border-2 transition-all duration-200 text-left",
              "hover:scale-[1.02] hover:shadow-md",
              selected === vibe.id
                ? "border-primary bg-primary/10 shadow-lg"
                : "border-border/50 bg-card hover:border-primary/50"
            )}
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center mb-2">
              {vibe.image_url ? (
                <img
                  src={vibe.image_url}
                  alt={vibe.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">{vibe.emoji || "✨"}</span>
              )}
            </div>
            <div className="font-medium text-sm leading-tight">{vibe.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{vibe.description}</div>
            
            {selected === vibe.id && (
              <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>
      
      {selected && (
        <button
          onClick={() => onSelect(null)}
          className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors py-2"
        >
          Clear selection (let AI decide)
        </button>
      )}
    </div>
  );
};

// Export a helper to get vibe by ID for use in other components
export const getVibeById = async (vibeId: string): Promise<Vibe | null> => {
  const { data, error } = await supabase
    .from("drink_vibes")
    .select("id, name, description, atmosphere_hint, emoji, image_url")
    .eq("id", vibeId)
    .single();

  if (error) {
    console.error("Error fetching vibe:", error);
    return null;
  }
  return data;
};
