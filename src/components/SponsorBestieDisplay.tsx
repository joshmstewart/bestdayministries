import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import AudioPlayer from "@/components/AudioPlayer";
import { FundingProgressBar } from "@/components/FundingProgressBar";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useNavigate } from "react-router-dom";
import { TextToSpeech } from "@/components/TextToSpeech";
import { SponsorshipBreakdownDialog } from "@/components/SponsorshipBreakdownDialog";


interface TextSection {
  header: string;
  text: string;
}

interface SponsorBestie {
  id: string;
  bestie_id: string | null;
  bestie_name: string;
  image_url: string;
  voice_note_url: string | null;
  aspect_ratio: string;
  monthly_goal: number | null;
  is_fully_funded: boolean;
  text_sections: TextSection[];
}

interface FundingProgress {
  sponsor_bestie_id: string;
  current_monthly_pledges: number;
  monthly_goal: number;
  funding_percentage: number;
  stripe_mode: string | null;
}

interface SponsorBestieDisplayProps {
  selectedBestieId?: string;
  canLoad?: boolean;
  onLoadComplete?: () => void;
}

export const SponsorBestieDisplay = ({ selectedBestieId, canLoad = true, onLoadComplete }: SponsorBestieDisplayProps = {}) => {
  const navigate = useNavigate();
  const [besties, setBesties] = useState<SponsorBestie[]>([]);
  const [fundingProgress, setFundingProgress] = useState<Record<string, FundingProgress>>({});
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sponsoringBesties, setSponsoringBesties] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(!selectedBestieId); // Pause if coming from direct link
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [api, setApi] = useState<any>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const autoScrollRef = useRef(false);

  useEffect(() => {
    if (canLoad) {
      loadUserRole();
      loadCurrentBesties();
    }
  }, [canLoad]);

  useEffect(() => {
    if (!api) return;

    // Update current slide when carousel changes
    const onSelect = () => {
      setCurrentSlide(api.selectedScrollSnap());
      
      // If this wasn't an auto-scroll, pause the autoplay
      if (!autoScrollRef.current) {
        setIsPlaying(false);
      }
      autoScrollRef.current = false;
    };

    api.on('select', onSelect);
    
    // Set initial slide
    setCurrentSlide(api.selectedScrollSnap());

    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || !isPlaying || isAudioPlaying) return;

    const intervalId = setInterval(() => {
      autoScrollRef.current = true;
      api.scrollNext();
    }, 7000);

    return () => clearInterval(intervalId);
  }, [api, isPlaying, isAudioPlaying]);

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
      console.log('🔵 LOADING BESTIES - Start');
      
      // Fetch all active and public besties from sponsor_besties table
      const { data: bestiesData, error: bestiesError } = await supabase
        .from('sponsor_besties')
        .select('*')
        .eq('is_active', true)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (bestiesError) throw bestiesError;

      console.log('🔵 FETCHED BESTIES:', {
        count: bestiesData?.length || 0,
        besties: bestiesData?.map(b => ({
          id: b.id,
          name: b.bestie_name,
          monthly_goal: b.monthly_goal,
          is_active: b.is_active,
          is_public: b.is_public
        }))
      });

      if (bestiesData && bestiesData.length > 0) {
        // Parse text_sections
        const parsedBesties = bestiesData.map(b => ({
          ...b,
          text_sections: Array.isArray(b.text_sections) ? b.text_sections : 
            (typeof b.text_sections === 'string' ? JSON.parse(b.text_sections) : [])
        }));
        
        // If there's a selected bestie, put it first, then randomize the rest
        let orderedBesties: typeof parsedBesties;
        if (selectedBestieId) {
          const selectedIndex = parsedBesties.findIndex(b => b.id === selectedBestieId);
          if (selectedIndex !== -1) {
            const selected = parsedBesties[selectedIndex];
            const others = [...parsedBesties.slice(0, selectedIndex), ...parsedBesties.slice(selectedIndex + 1)];
            const randomizedOthers = others.sort(() => Math.random() - 0.5);
            orderedBesties = [selected, ...randomizedOthers];
          } else {
            orderedBesties = [...parsedBesties].sort(() => Math.random() - 0.5);
          }
        } else {
          orderedBesties = [...parsedBesties].sort(() => Math.random() - 0.5);
        }
        
        setBesties(orderedBesties);

        // Check sponsorship statuses if user is logged in
        if (currentUserId) {
          const bestieIds = orderedBesties.map(b => b.bestie_id).filter(Boolean) as string[];
          if (bestieIds.length > 0) {
            await checkSponsorshipStatuses(bestieIds, currentUserId);
          }
        }

        // Get current Stripe mode
        const { data: modeData } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'stripe_mode')
          .single();
        
        let currentMode: 'test' | 'live' = 'test';
        if (modeData?.setting_value) {
          const rawValue = modeData.setting_value;
          const cleanValue = typeof rawValue === 'string' 
            ? rawValue.replace(/^"(.*)"$/, '$1')
            : String(rawValue);
          currentMode = (cleanValue === 'live' ? 'live' : 'test') as 'test' | 'live';
        }
        
        console.log('🔵 STRIPE MODE:', {
          rawValue: modeData?.setting_value,
          currentMode
        });

        // Load funding progress for besties with goals, filtered by Stripe mode
        const bestiesWithGoals = orderedBesties.filter(b => b.monthly_goal && b.monthly_goal > 0);
        
        console.log('🔵 BESTIES WITH GOALS:', {
          count: bestiesWithGoals.length,
          bestieIds: bestiesWithGoals.map(b => ({ id: b.id, name: b.bestie_name, goal: b.monthly_goal }))
        });
        
        if (bestiesWithGoals.length > 0) {
          // Query 1: Get besties with matching stripe mode
          const { data: matchingModeData } = await supabase
            .from('sponsor_bestie_funding_progress_by_mode')
            .select('*')
            .in('sponsor_bestie_id', bestiesWithGoals.map(b => b.id))
            .eq('stripe_mode', currentMode);

          console.log('🔵 MATCHING MODE DATA:', {
            mode: currentMode,
            count: matchingModeData?.length || 0,
            data: matchingModeData
          });

          // Query 2: Get besties with no sponsorships (null mode)
          const { data: nullModeData } = await supabase
            .from('sponsor_bestie_funding_progress_by_mode')
            .select('*')
            .in('sponsor_bestie_id', bestiesWithGoals.map(b => b.id))
            .is('stripe_mode', null);

          console.log('🔵 NULL MODE DATA:', {
            count: nullModeData?.length || 0,
            data: nullModeData
          });

          // Merge results: prioritize matching mode over null
          const progressMap: Record<string, FundingProgress> = {};

          // First add all null mode entries (besties with $0)
          if (nullModeData) {
            nullModeData.forEach(p => {
              progressMap[p.sponsor_bestie_id] = p;
            });
          }

          console.log('🔵 PROGRESS MAP AFTER NULL:', progressMap);

          // Then overwrite with matching mode entries (actual funding in current mode)
          if (matchingModeData) {
            matchingModeData.forEach(p => {
              progressMap[p.sponsor_bestie_id] = p;
            });
          }

          console.log('🔵 FINAL PROGRESS MAP:', progressMap);
          
          // Log which besties have progress and which don't
          const bestiesWithProgress = bestiesWithGoals.filter(b => progressMap[b.id]);
          const bestiesWithoutProgress = bestiesWithGoals.filter(b => !progressMap[b.id]);
          
          console.log('✅ BESTIES WITH PROGRESS:', {
            count: bestiesWithProgress.length,
            besties: bestiesWithProgress.map(b => ({ id: b.id, name: b.bestie_name, progress: progressMap[b.id] }))
          });
          
          console.log('❌ BESTIES WITHOUT PROGRESS:', {
            count: bestiesWithoutProgress.length,
            besties: bestiesWithoutProgress.map(b => ({ id: b.id, name: b.bestie_name, goal: b.monthly_goal }))
          });

          setFundingProgress(progressMap);
        }
      }
    } catch (error) {
      console.error('Error loading besties:', error);
    } finally {
      setLoading(false);
      onLoadComplete?.();
    }
  };

  const handleSponsorClick = (featuredBestieId: string) => {
    navigate(`/sponsor-bestie?bestieId=${featuredBestieId}`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-9 w-64 bg-muted rounded animate-pulse" />
        <Card className="border-2 overflow-hidden animate-pulse">
          <CardContent className="p-0">
            <div className="grid md:grid-cols-2 gap-0">
              {/* Image skeleton */}
              <div className="relative bg-muted" style={{ maxHeight: '450px', minHeight: '400px' }}>
                <div className="w-full h-full bg-muted-foreground/10" />
              </div>
              {/* Content skeleton */}
              <div className="p-6 space-y-4 flex flex-col justify-center">
                <div className="h-8 w-3/4 bg-muted rounded" />
                <div className="h-24 w-full bg-muted rounded" />
                <div className="h-16 w-full bg-muted rounded" />
                <div className="h-12 w-full bg-muted rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
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

    // Parse aspect ratio
    const getAspectRatio = (ratio: string): number => {
      const [w, h] = ratio.split(':').map(Number);
      if (w && h) return w / h;
      // Fallback mappings
      if (ratio === 'landscape') return 16 / 9;
      if (ratio === 'portrait') return 9 / 16;
      if (ratio === 'square') return 1;
      return 9 / 16; // default
    };

    return (
      <Card key={bestie.id} className="border-2 hover:border-primary/50 transition-all overflow-hidden">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left side - Image */}
            <div className="relative overflow-hidden flex items-center justify-center bg-muted" style={{ maxHeight: '450px' }}>
              <img
                src={bestie.image_url}
                alt={bestie.bestie_name}
                className="object-contain w-full h-full"
                style={{ maxHeight: '450px' }}
                crossOrigin="anonymous"
              />
              <div className="absolute top-4 left-4">
                <div className="bg-gradient-warm px-4 py-1.5 rounded-full shadow-lg">
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

            {/* Right side - Content */}
            <div className="p-6 space-y-4 flex flex-col justify-center">
              {bestie.text_sections && bestie.text_sections.length > 0 ? (
                <>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-script text-2xl font-bold text-primary leading-tight">
                      {bestie.text_sections[0]?.header}
                    </h3>
                    <TextToSpeech 
                      text={bestie.text_sections.map(s => [s.header, s.text].filter(Boolean).join('. ')).join('. ')}
                      size="default"
                      onPlayingChange={setIsAudioPlaying}
                    />
                  </div>
                  {bestie.text_sections.map((section, index) => (
                    <div key={index} className="space-y-2">
                      {index > 0 && section.header && (
                        <h3 className="font-script text-2xl font-bold text-primary leading-tight">
                          {section.header}
                        </h3>
                      )}
                      {section.text && (
                        <p className="font-script text-base text-foreground/80 leading-relaxed whitespace-pre-line">
                          {section.text}
                        </p>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  <p>No content available</p>
                </div>
              )}

              {bestie.voice_note_url && (
                <div className="pt-2">
                  <AudioPlayer src={bestie.voice_note_url} />
                </div>
              )}

              {bestie.monthly_goal && bestie.monthly_goal > 0 && (
                <div className="mt-4 space-y-2">
                  <SponsorshipBreakdownDialog />
                  <FundingProgressBar
                    currentAmount={progress?.current_monthly_pledges || 0}
                    goalAmount={bestie.monthly_goal}
                  />
                </div>
              )}

              {showSponsorButton && (
                <Button
                  onClick={() => handleSponsorClick(bestie.id)}
                  className="w-full bg-gradient-warm border-0 shadow-warm hover:shadow-glow transition-all text-white font-bold py-6 text-lg"
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
          </div>

          {besties.length > 1 && (
            <div className="flex justify-center items-center gap-4 pt-3 pb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => api?.scrollPrev()}
                className="h-8 w-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
                className="h-8 w-8"
              >
                {isPlaying && !isAudioPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </Button>
              <div className="flex gap-2">
                {besties.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => api?.scrollTo(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      currentSlide === index
                        ? "w-8 bg-primary"
                        : "w-2 bg-primary/30 hover:bg-primary/50"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => api?.scrollNext()}
                className="h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
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
    </div>
  );
};
