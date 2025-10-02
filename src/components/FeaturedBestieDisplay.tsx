import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, HandHeart } from "lucide-react";
import { format } from "date-fns";
import AudioPlayer from "./AudioPlayer";
import { TextToSpeech } from "./TextToSpeech";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { FundingProgressBar } from "./FundingProgressBar";
import type { UserRole } from "@/hooks/useRoleImpersonation";

interface FeaturedBestie {
  id: string;
  bestie_name: string;
  image_url: string;
  voice_note_url: string | null;
  description: string;
  start_date: string;
  end_date: string;
  available_for_sponsorship: boolean;
  is_fully_funded: boolean;
  monthly_goal: number | null;
}

interface FundingProgress {
  current_monthly_pledges: number;
  monthly_goal: number;
  funding_percentage: number;
}

export const FeaturedBestieDisplay = () => {
  const navigate = useNavigate();
  const [bestie, setBestie] = useState<FeaturedBestie | null>(null);
  const [fundingProgress, setFundingProgress] = useState<FundingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    loadCurrentBestie();
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      
      if (profile) {
        setUserRole(profile.role);
      }
    }
  };

  const loadCurrentBestie = async () => {
    try {
      // Get today's date in format YYYY-MM-DD
      const today = format(new Date(), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("featured_besties")
        .select("*")
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .lte("start_date", today)
        .gte("end_date", today)
        .maybeSingle();

      if (error) throw error;
      setBestie(data);

      // Load funding progress if bestie is available for sponsorship
      if (data?.available_for_sponsorship && data?.monthly_goal && data.monthly_goal > 0) {
        const { data: progressData, error: progressError } = await supabase
          .from("bestie_funding_progress")
          .select("current_monthly_pledges, monthly_goal, funding_percentage")
          .eq("featured_bestie_id", data.id)
          .maybeSingle();

        if (progressError) {
          console.error("Error loading funding progress:", progressError);
        } else {
          setFundingProgress(progressData);
        }
      }
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
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-black text-foreground flex-1">
              {bestie.bestie_name}
            </h2>
            <TextToSpeech text={`${bestie.bestie_name}. ${bestie.description}`} />
          </div>
          <p className="text-base text-muted-foreground leading-relaxed">
            {bestie.description}
          </p>
          {bestie.voice_note_url && (
            <div className="space-y-2">
              <AudioPlayer src={bestie.voice_note_url} />
            </div>
          )}
          
          {fundingProgress && bestie.monthly_goal && bestie.monthly_goal > 0 && (
            <FundingProgressBar
              currentAmount={fundingProgress.current_monthly_pledges}
              goalAmount={fundingProgress.monthly_goal}
              className="mt-4"
            />
          )}
          
          {bestie.available_for_sponsorship && !bestie.is_fully_funded && userRole !== "bestie" && (
            <Button 
              onClick={() => navigate(`/sponsor-bestie?bestie=${bestie.id}`)}
              className="mt-4 bg-gradient-to-r from-primary via-accent to-secondary border-0 shadow-warm hover:shadow-glow transition-all"
              size="lg"
            >
              <HandHeart className="w-5 h-5 mr-2" />
              Sponsor {bestie.bestie_name}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
