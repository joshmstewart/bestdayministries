import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, HandHeart, Play, Pause } from "lucide-react";
import { format } from "date-fns";
import AudioPlayer from "./AudioPlayer";
import { TextToSpeech } from "./TextToSpeech";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { FundingProgressBar } from "./FundingProgressBar";
import type { UserRole } from "@/hooks/useRoleImpersonation";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";

interface FeaturedBestie {
  id: string;
  bestie_id: string | null;
  bestie_name: string;
  image_url: string;
  voice_note_url: string | null;
  description: string;
  start_date: string | null;
  end_date: string | null;
  available_for_sponsorship: boolean;
  is_fully_funded: boolean;
  monthly_goal: number | null;
  aspect_ratio: string;
}

interface FundingProgress {
  current_monthly_pledges: number;
  monthly_goal: number;
  funding_percentage: number;
}

export const FeaturedBestieDisplay = () => {
  const navigate = useNavigate();
  const [besties, setBesties] = useState<FeaturedBestie[]>([]);
  const [fundingProgress, setFundingProgress] = useState<Record<string, FundingProgress>>({});
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [sponsoringIds, setSponsoringIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    loadUserRole();
  }, []);

  useEffect(() => {
    loadCurrentBesties();
  }, [userId]);

  useEffect(() => {
    if (!carouselApi || besties.length <= 1) return;

    carouselApi.on("select", () => {
      setCurrent(carouselApi.selectedScrollSnap());
    });

    // Auto-advance carousel
    const intervalId = setInterval(() => {
      if (isPlaying && besties.length > 1) {
        carouselApi.scrollNext();
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [carouselApi, isPlaying, besties.length]);

  const loadUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
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

  const checkSponsorshipStatuses = async (bestieIds: string[], currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from("sponsorships")
        .select("bestie_id")
        .in("bestie_id", bestieIds)
        .eq("sponsor_id", currentUserId)
        .eq("status", "active");

      if (error && error.code !== "PGRST116") {
        console.error("Error checking sponsorships:", error);
      }
      
      const sponsoredIds = new Set(data?.map(s => s.bestie_id) || []);
      setSponsoringIds(sponsoredIds);
    } catch (error) {
      console.error("Error checking sponsorship statuses:", error);
    }
  };

  const loadCurrentBesties = async () => {
    try {
      // Get today's date in format YYYY-MM-DD
      const today = format(new Date(), "yyyy-MM-dd");
      
      // Query for besties that have dates set and include today
      const { data, error } = await supabase
        .from("featured_besties")
        .select("*")
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .not("start_date", "is", null)
        .not("end_date", "is", null)
        .lte("start_date", today)
        .gte("end_date", today);

      if (error) throw error;
      
      // Randomize the order
      const shuffled = data ? [...data].sort(() => Math.random() - 0.5) : [];
      setBesties(shuffled);

      // Check sponsorship statuses for all besties
      if (shuffled.length > 0 && userId) {
        const bestieIds = shuffled.map(b => b.bestie_id).filter(Boolean) as string[];
        if (bestieIds.length > 0) {
          await checkSponsorshipStatuses(bestieIds, userId);
        }
      }

      // Load funding progress for all besties with sponsorship enabled
      const progressMap: Record<string, FundingProgress> = {};
      for (const bestie of shuffled) {
        if (bestie.available_for_sponsorship && bestie.monthly_goal && bestie.monthly_goal > 0) {
          const { data: progressData, error: progressError } = await supabase
            .from("bestie_funding_progress")
            .select("current_monthly_pledges, monthly_goal, funding_percentage")
            .eq("featured_bestie_id", bestie.id)
            .maybeSingle();

          if (!progressError && progressData) {
            progressMap[bestie.id] = progressData;
          }
        }
      }
      setFundingProgress(progressMap);
    } catch (error: any) {
      console.error("Error loading featured besties:", error);
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

  if (besties.length === 0) {
    return null;
  }

  // Single bestie - render without carousel
  if (besties.length === 1) {
    const bestie = besties[0];
    const isSponsoring = bestie.bestie_id ? sponsoringIds.has(bestie.bestie_id) : false;
    const progress = fundingProgress[bestie.id];

    return (
      <Card className={`border-2 shadow-warm overflow-hidden transition-all ${
        isSponsoring 
          ? "border-primary/50 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 shadow-glow" 
          : "border-primary/20"
      }`}>
        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Image Section */}
          <div className="relative overflow-hidden rounded-lg">
            <AspectRatio ratio={(() => {
              const [w, h] = (bestie.aspect_ratio || '9:16').split(':').map(Number);
              return w / h;
            })()}>
              <img
                src={bestie.image_url}
                alt={bestie.bestie_name}
                className="object-cover w-full h-full"
              />
            </AspectRatio>
            <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1.5 rounded-full font-bold flex items-center gap-2 text-sm">
              <Heart className="w-4 h-4 fill-current" />
              Bestie of the Month
            </div>
            {isSponsoring && (
              <div className="absolute top-4 right-4 bg-gradient-to-r from-primary via-accent to-secondary text-primary-foreground px-3 py-1.5 rounded-full font-bold flex items-center gap-2 text-sm shadow-glow animate-pulse">
                <Heart className="w-4 h-4 fill-current" />
                You're Sponsoring!
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="flex flex-col justify-center space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-black text-foreground flex-1">
                {bestie.bestie_name}
                {isSponsoring && (
                  <span className="ml-2 inline-flex items-center gap-1 text-base font-normal text-primary">
                    <Heart className="w-4 h-4 fill-current" />
                  </span>
                )}
              </h2>
              <TextToSpeech text={`${bestie.bestie_name}. ${bestie.description}`} />
            </div>
            {isSponsoring && (
              <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border border-primary/20 rounded-lg p-3">
                <p className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Heart className="w-4 h-4 fill-current" />
                  Thank you for being an amazing sponsor! Your support makes a real difference in {bestie.bestie_name}'s life.
                </p>
              </div>
            )}
            <p className="text-base text-muted-foreground leading-relaxed">
              {bestie.description}
            </p>
            {bestie.voice_note_url && (
              <div className="space-y-2">
                <AudioPlayer src={bestie.voice_note_url} />
              </div>
            )}
            
            {progress && bestie.monthly_goal && bestie.monthly_goal > 0 && (
              <FundingProgressBar
                currentAmount={progress.current_monthly_pledges}
                goalAmount={progress.monthly_goal}
                className="mt-4"
              />
            )}
            
            {bestie.available_for_sponsorship && !bestie.is_fully_funded && userRole !== "bestie" && !isSponsoring && (
              <Button 
                onClick={() => navigate(`/sponsor-bestie?bestie=${bestie.id}`)}
                className="mt-4 bg-gradient-warm border-0 shadow-warm hover:shadow-glow transition-all"
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
  }

  // Multiple besties - render with carousel
  return (
    <div className="space-y-4">
      <Carousel
        setApi={setCarouselApi}
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {besties.map((bestie) => {
            const isSponsoring = bestie.bestie_id ? sponsoringIds.has(bestie.bestie_id) : false;
            const progress = fundingProgress[bestie.id];

            return (
              <CarouselItem key={bestie.id}>
                <Card className={`border-2 shadow-warm overflow-hidden transition-all ${
                  isSponsoring 
                    ? "border-primary/50 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 shadow-glow" 
                    : "border-primary/20"
                }`}>
                  <div className="grid md:grid-cols-2 gap-6 p-6">
                    {/* Image Section */}
                    <div className="relative overflow-hidden rounded-lg">
                      <AspectRatio ratio={(() => {
                        const [w, h] = (bestie.aspect_ratio || '9:16').split(':').map(Number);
                        return w / h;
                      })()}>
                        <img
                          src={bestie.image_url}
                          alt={bestie.bestie_name}
                          className="object-cover w-full h-full"
                        />
                      </AspectRatio>
                      <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1.5 rounded-full font-bold flex items-center gap-2 text-sm">
                        <Heart className="w-4 h-4 fill-current" />
                        Bestie of the Month
                      </div>
                      {isSponsoring && (
                        <div className="absolute top-4 right-4 bg-gradient-to-r from-primary via-accent to-secondary text-primary-foreground px-3 py-1.5 rounded-full font-bold flex items-center gap-2 text-sm shadow-glow animate-pulse">
                          <Heart className="w-4 h-4 fill-current" />
                          You're Sponsoring!
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-col justify-center space-y-4">
                      <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-black text-foreground flex-1">
                          {bestie.bestie_name}
                          {isSponsoring && (
                            <span className="ml-2 inline-flex items-center gap-1 text-base font-normal text-primary">
                              <Heart className="w-4 h-4 fill-current" />
                            </span>
                          )}
                        </h2>
                        <TextToSpeech text={`${bestie.bestie_name}. ${bestie.description}`} />
                      </div>
                      {isSponsoring && (
                        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border border-primary/20 rounded-lg p-3">
                          <p className="text-sm font-semibold text-primary flex items-center gap-2">
                            <Heart className="w-4 h-4 fill-current" />
                            Thank you for being an amazing sponsor! Your support makes a real difference in {bestie.bestie_name}'s life.
                          </p>
                        </div>
                      )}
                      <p className="text-base text-muted-foreground leading-relaxed">
                        {bestie.description}
                      </p>
                      {bestie.voice_note_url && (
                        <div className="space-y-2">
                          <AudioPlayer src={bestie.voice_note_url} />
                        </div>
                      )}
                      
                      {progress && bestie.monthly_goal && bestie.monthly_goal > 0 && (
                        <FundingProgressBar
                          currentAmount={progress.current_monthly_pledges}
                          goalAmount={progress.monthly_goal}
                          className="mt-4"
                        />
                      )}
                      
                      {bestie.available_for_sponsorship && !bestie.is_fully_funded && userRole !== "bestie" && !isSponsoring && (
                        <Button 
                          onClick={() => navigate(`/sponsor-bestie?bestie=${bestie.id}`)}
                          className="mt-4 bg-gradient-warm border-0 shadow-warm hover:shadow-glow transition-all"
                          size="lg"
                        >
                          <HandHeart className="w-5 h-5 mr-2" />
                          Sponsor {bestie.bestie_name}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {/* Carousel Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsPlaying(!isPlaying)}
          className="h-8 w-8"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        <div className="flex gap-2">
          {besties.map((_, index) => (
            <button
              key={index}
              className={`h-2 w-2 rounded-full transition-all ${
                index === current
                  ? "bg-primary w-8"
                  : "bg-primary/30 hover:bg-primary/50"
              }`}
              onClick={() => carouselApi?.scrollTo(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
