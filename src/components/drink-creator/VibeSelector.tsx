import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { SectionLoadingState } from "@/components/common";

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
    return <SectionLoadingState />;
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
              "relative rounded-xl border-2 transition-all duration-200 text-left overflow-hidden",
              "hover:scale-[1.02] hover:shadow-md",
              selected === vibe.id
                ? "border-primary bg-primary/10 shadow-lg ring-2 ring-primary/30"
                : "border-border/50 bg-card hover:border-primary/50"
            )}
          >
            <div className="aspect-square w-full overflow-hidden bg-muted flex items-center justify-center">
              {vibe.image_url ? (
                <img
                  src={vibe.image_url}
                  alt={vibe.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl">{vibe.emoji || "✨"}</span>
              )}
            </div>
            <div className="p-2">
              <div className="font-medium text-sm leading-tight">{vibe.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{vibe.description}</div>
            </div>
            
            {selected === vibe.id && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
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
