import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Pause, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import AudioPlayer from "@/components/AudioPlayer";
import { FundingProgressBar } from "@/components/FundingProgressBar";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useNavigate } from "react-router-dom";

interface SponsorBestie {
  id: string;
  bestie_id: string | null;
  bestie_name: string;
  description: string;
  image_url: string;
  voice_note_url: string | null;
  aspect_ratio: string;
  monthly_goal: number | null;
  is_fully_funded: boolean;
  heading_font: string;
  heading_color: string;
  body_font: string;
  body_color: string;
}

interface FundingProgress {
  sponsor_bestie_id: string;
  current_monthly_pledges: number;
  monthly_goal: number;
  funding_percentage: number;
}

export const SponsorBestieDisplay = () => {
  const navigate = useNavigate();
  const [besties, setBesties] = useState<SponsorBestie[]>([]);
  const [fundingProgress, setFundingProgress] = useState<Record<string, FundingProgress>>({});
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sponsoringBesties, setSponsoringBesties] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(true);
  const [api, setApi] = useState<any>();

  useEffect(() => {
    loadUserRole();
    loadCurrentBesties();
  }, []);

  useEffect(() => {
    if (!api || !isPlaying) return;

    const intervalId = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [api, isPlaying]);

  const loadUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const checkSponsorshipStatuses = async (bestieIds: string[], userId: string) => {
    const { data: sponsorships } = await supabase
      .from('sponsorships')
      .select('bestie_id')
      .eq('sponsor_id', userId)
      .eq('status', 'active')
      .in('bestie_id', bestieIds);

    if (sponsorships) {
      const sponsoredIds = new Set(sponsorships.map(s => s.bestie_id));
      setSponsoringBesties(sponsoredIds);
    }
  };

  const loadCurrentBesties = async () => {
    try {
      // Fetch all besties available for sponsorship from sponsor_besties table
      const { data: bestiesData, error: bestiesError } = await supabase
        .from('sponsor_besties')
        .select('*')
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      if (bestiesError) throw bestiesError;

      if (bestiesData && bestiesData.length > 0) {
        // Randomize the order
        const randomized = [...bestiesData].sort(() => Math.random() - 0.5);
        setBesties(randomized);

        // Check sponsorship statuses if user is logged in
        if (currentUserId) {
          const bestieIds = randomized.map(b => b.bestie_id).filter(Boolean) as string[];
          if (bestieIds.length > 0) {
            await checkSponsorshipStatuses(bestieIds, currentUserId);
          }
        }

        // Load funding progress for besties with goals
        const bestiesWithGoals = randomized.filter(b => b.monthly_goal && b.monthly_goal > 0);
        if (bestiesWithGoals.length > 0) {
          const { data: progressData } = await supabase
            .from('sponsor_bestie_funding_progress')
            .select('*')
            .in('sponsor_bestie_id', bestiesWithGoals.map(b => b.id));

          if (progressData) {
            const progressMap: Record<string, FundingProgress> = {};
            progressData.forEach(p => {
              progressMap[p.sponsor_bestie_id] = p;
            });
            setFundingProgress(progressMap);
          }
        }
      }
    } catch (error) {
      console.error('Error loading besties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSponsorClick = (featuredBestieId: string) => {
    navigate(`/sponsor-bestie?bestieId=${featuredBestieId}`);
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading sponsorships...</div>
      </div>
    );
  }

  if (besties.length === 0) {
    return null;
  }

  const renderBestieCard = (bestie: SponsorBestie) => {
    const progress = fundingProgress[bestie.id];
    const isSponsoring = bestie.bestie_id ? sponsoringBesties.has(bestie.bestie_id) : false;
    const isFullyFunded = bestie.is_fully_funded || (progress?.funding_percentage >= 100);
    const showSponsorButton = !isFullyFunded;

    return (
      <Card key={bestie.id} className="border-2 hover:border-primary/50 transition-all overflow-hidden">
        <CardContent className="p-0">
          <div className="relative">
            <AspectRatio ratio={bestie.aspect_ratio === 'landscape' ? 16/9 : bestie.aspect_ratio === 'square' ? 1 : 3/4}>
              <img
                src={bestie.image_url}
                alt={bestie.bestie_name}
                className="object-cover w-full h-full"
              />
            </AspectRatio>
            <div className="absolute top-4 left-4">
              <div className="bg-gradient-to-r from-primary via-accent to-secondary px-4 py-1.5 rounded-full shadow-lg">
                <span className="text-white font-bold text-sm">Available for Sponsorship</span>
              </div>
            </div>
            {isSponsoring && (
              <div className="absolute top-4 right-4">
                <div className="bg-green-500 px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                  <Heart className="w-4 h-4 text-white fill-white" />
                  <span className="text-white font-semibold text-xs">You're Sponsoring!</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            <h3 
              className="font-black leading-tight"
              style={{
                fontFamily: bestie.heading_font,
                color: bestie.heading_color,
                fontSize: '2rem'
              }}
            >
              {bestie.bestie_name}
            </h3>
            
            <p 
              className="leading-relaxed"
              style={{
                fontFamily: bestie.body_font,
                color: bestie.body_color,
                fontSize: '1rem'
              }}
            >
              {bestie.description}
            </p>

            {bestie.voice_note_url && (
              <div className="pt-2">
                <AudioPlayer src={bestie.voice_note_url} />
              </div>
            )}

            {progress && bestie.monthly_goal && (
              <FundingProgressBar
                currentAmount={progress.current_monthly_pledges}
                goalAmount={bestie.monthly_goal}
                className="mt-4"
              />
            )}

            {showSponsorButton && (
              <Button
                onClick={() => handleSponsorClick(bestie.id)}
                className="w-full bg-gradient-to-r from-primary via-accent to-secondary hover:opacity-90 transition-opacity text-white font-bold py-6 text-lg"
                size="lg"
              >
                <Heart className="w-5 h-5 mr-2" />
                Sponsor This Bestie
              </Button>
            )}

            {isFullyFunded && (
              <div className="text-center py-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-green-600 dark:text-green-400 font-semibold">
                  ✓ Fully Funded! Thank you to all sponsors!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Single bestie - display directly
  if (besties.length === 1) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black text-foreground">
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Sponsor a Bestie
            </span>
          </h2>
        </div>
        {renderBestieCard(besties[0])}
      </div>
    );
  }

  // Multiple besties - display in carousel
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-foreground">
          <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Sponsor a Bestie
          </span>
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsPlaying(!isPlaying)}
          className="rounded-full"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent>
          {besties.map((bestie) => (
            <CarouselItem key={bestie.id}>
              {renderBestieCard(bestie)}
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="flex justify-center gap-2 pt-2">
        {besties.map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              api?.selectedScrollSnap() === index
                ? "bg-primary w-8"
                : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
};
