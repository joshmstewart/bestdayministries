import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { format } from "date-fns";
import AudioPlayer from "./AudioPlayer";

interface FeaturedBestie {
  id: string;
  bestie_name: string;
  image_url: string;
  voice_note_url: string | null;
  description: string;
  start_date: string;
  end_date: string;
}

export const FeaturedBestieDisplay = () => {
  const [bestie, setBestie] = useState<FeaturedBestie | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentBestie();
  }, []);

  const loadCurrentBestie = async () => {
    try {
      // Get today's date in format YYYY-MM-DD
      const today = format(new Date(), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("featured_besties")
        .select("*")
        .eq("is_active", true)
        .lte("start_date", today)
        .gte("end_date", today)
        .maybeSingle();

      if (error) throw error;
      setBestie(data);
    } catch (error: any) {
      console.error("Error loading featured bestie:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-muted rounded-lg"></div>
      </div>
    );
  }

  if (!bestie) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20 shadow-warm overflow-hidden">
      <div className="grid md:grid-cols-2 gap-6 p-6">
        {/* Image Section */}
        <div className="relative aspect-square md:aspect-auto overflow-hidden rounded-lg">
          <img
            src={bestie.image_url}
            alt={bestie.bestie_name}
            className="object-cover w-full h-full"
          />
          <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1.5 rounded-full font-bold flex items-center gap-2 text-sm">
            <Heart className="w-4 h-4 fill-current" />
            Bestie of the Month
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-col justify-center space-y-4">
          <h2 className="text-3xl font-black text-foreground">
            {bestie.bestie_name}
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            {bestie.description}
          </p>
          {bestie.voice_note_url && (
            <div className="space-y-2">
              <AudioPlayer src={bestie.voice_note_url} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
