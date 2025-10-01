import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Volume2 } from "lucide-react";
import { format } from "date-fns";

interface FeaturedBestie {
  id: string;
  bestie_name: string;
  image_url: string;
  voice_note_url: string | null;
  description: string;
  featured_month: string;
}

export const FeaturedBestieDisplay = () => {
  const [bestie, setBestie] = useState<FeaturedBestie | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentBestie();
  }, []);

  const loadCurrentBestie = async () => {
    try {
      // Get current year-month in format YYYY-MM-01
      const now = new Date();
      const currentMonth = format(now, "yyyy-MM-01");
      
      const { data, error } = await supabase
        .from("featured_besties")
        .select("*")
        .eq("is_active", true)
        .gte("featured_month", currentMonth)
        .lt("featured_month", format(new Date(now.getFullYear(), now.getMonth() + 1, 1), "yyyy-MM-01"))
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
            <div className="bg-secondary/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Volume2 className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Hear from {bestie.bestie_name}</span>
              </div>
              <audio controls className="w-full">
                <source src={bestie.voice_note_url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
