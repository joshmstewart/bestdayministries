import { useState, useEffect } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Sparkles, Users, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FundingProgressBar } from "@/components/FundingProgressBar";
import { VideoPlayer } from "@/components/VideoPlayer";
import { SponsorBestieDisplay } from "@/components/SponsorBestieDisplay";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StripeModeSwitcher } from "@/components/admin/StripeModeSwitcher";

interface Bestie {
  id: string;
  bestie_name: string;
  image_url: string;
  text_sections: Array<{header: string; text: string}>;
  monthly_goal: number | null;
}

interface FundingProgress {
  sponsor_bestie_id: string;
  current_monthly_pledges: number;
  monthly_goal: number;
  funding_percentage: number;
}

interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
}

const sponsorshipSchema = z.object({
  amount: z.number().min(10, "Minimum sponsorship is $10"),
  email: z.string().email("Invalid email address"),
});

const SponsorBestie = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [besties, setBesties] = useState<Bestie[]>([]);
  const [featuredVideo, setFeaturedVideo] = useState<Video | null>(null);
  const [fundingProgress, setFundingProgress] = useState<Record<string, FundingProgress>>({});
  const [selectedBestie, setSelectedBestie] = useState<string>("");
  const [frequency, setFrequency] = useState<"one-time" | "monthly">("monthly");
  const [amount, setAmount] = useState<string>("25");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState({
    badge_text: "Sponsor a Bestie",
    main_heading: "Change a Life Today",
    description: "Sponsor a Bestie and directly support their journey of growth, creativity, and community engagement",
    featured_video_id: ""
  });
  const [sections, setSections] = useState<Array<{ section_key: string; is_visible: boolean; display_order: number }>>([]);

  useEffect(() => {
    const bestieId = searchParams.get('bestieId');
    loadBesties(bestieId);
    checkAuthAndLoadEmail();
    loadPageContent();
    loadSections();
  }, []);

  const loadPageContent = async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "sponsor_page_content")
      .maybeSingle();

    if (!error && data?.setting_value) {
      const parsed = typeof data.setting_value === 'string' 
        ? JSON.parse(data.setting_value) 
        : data.setting_value;
      setPageContent(parsed);
      
      // Load featured video if one is selected
      if (parsed.featured_video_id) {
        loadFeaturedVideo(parsed.featured_video_id);
      }
    }
  };

  const loadSections = async () => {
    const { data } = await supabase
      .from("sponsor_page_sections")
      .select("section_key, is_visible, display_order")
      .eq("is_visible", true)
      .order("display_order", { ascending: true });
    
    if (data) {
      setSections(data);
    }
  };

  useEffect(() => {
    // Check if there's a bestie ID in the URL
    const bestieId = searchParams.get('bestieId');
    if (bestieId && besties.length > 0) {
      const bestieExists = besties.find(b => b.id === bestieId);
      if (bestieExists) {
        setSelectedBestie(bestieId);
        // Scroll to the bestie selection
        setTimeout(() => {
          document.getElementById(`bestie-${bestieId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    }
  }, [searchParams, besties]);

  useEffect(() => {
    if (besties.length > 0) {
      loadFundingProgress();
    }
  }, [besties]);

  const checkAuthAndLoadEmail = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setIsLoggedIn(true);
      // Fetch role from user_roles table (security requirement)
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      
      // Store role for admin UI
      if (roleData?.role) {
        setUserRole(roleData.role);
      }
      
      // Warn besties but don't block them
      if (roleData?.role === "bestie") {
        toast.info("Note: Besties typically receive sponsorships rather than giving them.");
      }
      
      // Get email from auth user object instead of profiles
      if (user.email) {
        setEmail(user.email);
      }
    }
  };

  const loadBesties = async (preSelectedBestieId?: string | null) => {
    const { data, error } = await supabase
      .from("sponsor_besties")
      .select("id, bestie_name, image_url, text_sections, monthly_goal")
      .eq("is_active", true)
      .eq("is_public", true)
      .eq("approval_status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading besties:", error);
      toast.error("Unable to load besties. Please refresh the page.");
      return;
    }

    if (!data || data.length === 0) {
      console.log("No besties found matching criteria");
      setBesties([]);
      return;
    }

    // Parse text_sections
    const parsedBesties = (data || []).map(b => ({
      ...b,
      text_sections: Array.isArray(b.text_sections) ? b.text_sections : 
        (typeof b.text_sections === 'string' ? JSON.parse(b.text_sections) : [])
    }));

    // If a specific bestie is pre-selected, move it to the front
    let finalBesties;
    if (preSelectedBestieId) {
      const selectedIndex = parsedBesties.findIndex(b => b.id === preSelectedBestieId);
      if (selectedIndex !== -1) {
        // Move selected bestie to front, keep rest in order
        finalBesties = [
          parsedBesties[selectedIndex],
          ...parsedBesties.slice(0, selectedIndex),
          ...parsedBesties.slice(selectedIndex + 1)
        ];
      } else {
        finalBesties = parsedBesties;
      }
    } else {
      // No pre-selection, randomize the order
      finalBesties = parsedBesties.sort(() => Math.random() - 0.5);
    }

    setBesties(finalBesties);
    
    // Pre-select the first bestie (which will be the pre-selected one if provided)
    if (finalBesties.length > 0) {
      setSelectedBestie(finalBesties[0].id);
    }
  };

  const loadFundingProgress = async () => {
    const { data, error } = await supabase
      .from("sponsor_bestie_funding_progress")
      .select("*");

    if (error) {
      console.error("Error loading funding progress:", error);
      return;
    }

    // Create a map of bestie ID to funding progress
    const progressMap: Record<string, FundingProgress> = {};
    data?.forEach(progress => {
      progressMap[progress.sponsor_bestie_id] = progress;
    });
    setFundingProgress(progressMap);
  };

  const loadFeaturedVideo = async (videoId: string) => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, description, video_url, thumbnail_url")
        .eq("id", videoId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      setFeaturedVideo(data);
    } catch (error) {
      console.error("Error loading featured video:", error);
    }
  };

  const handleSponsorship = async () => {
    try {
      setLoading(true);

      // Validate inputs
      const validation = sponsorshipSchema.safeParse({
        amount: parseFloat(amount),
        email: email.trim(),
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      if (!selectedBestie) {
        toast.error("Please select a bestie to sponsor");
        return;
      }

      // Call Stripe edge function to create checkout session
      const { data, error } = await supabase.functions.invoke("create-sponsorship-checkout", {
        body: {
          bestie_id: selectedBestie,
          amount: parseFloat(amount),
          frequency,
          email: email.trim(),
        },
      });

      if (error) throw error;

      // Open Stripe checkout in new tab
      if (data.url) {
        const checkoutWindow = window.open(data.url, '_blank');
        if (!checkoutWindow) {
          toast.error("Please allow pop-ups to complete checkout");
        } else {
          toast.success("Opening checkout in new tab...");
        }
      }
    } catch (error) {
      console.error("Error creating sponsorship:", error);
      toast.error("Failed to start sponsorship. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const presetAmounts = ["10", "25", "50", "100"];

  const renderSection = (sectionKey: string) => {
    switch (sectionKey) {
      case 'header':
        return (
          <div className="text-center mb-8 space-y-3 animate-fade-in" key="header">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-2">
              <Heart className="w-3 h-3 text-primary" />
              <span className="text-xs font-semibold text-primary">{pageContent.badge_text}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground">
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                {pageContent.main_heading}
              </span>
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto whitespace-pre-line">
              {pageContent.description}
            </p>
          </div>
        );
      
      case 'featured_video':
        return featuredVideo ? (
          <div className="mb-8 max-w-4xl mx-auto" key="featured_video">
            <VideoPlayer
              src={featuredVideo.video_url}
              poster={featuredVideo.thumbnail_url || undefined}
              title={featuredVideo.title}
              className="w-full"
            />
            {featuredVideo.description && (
              <p className="text-center text-sm text-muted-foreground mt-3">
                {featuredVideo.description}
              </p>
            )}
          </div>
        ) : null;
      
      case 'sponsor_carousel':
        return (
          <div className="mb-8" key="sponsor_carousel">
            <SponsorBestieDisplay selectedBestieId={selectedBestie} />
          </div>
        );
      
      case 'selection_form':
        return (
          <div className="grid lg:grid-cols-2 gap-8 items-start" key="selection_form">
            {/* Bestie Selection */}
            <Card className="border-2 shadow-xl lg:sticky lg:top-24">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                    <Users className="w-6 h-6 text-primary" />
                    Select a Bestie
                  </h2>

                  {besties.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No besties available for sponsorship at this time.</p>
                  ) : (
                    <ScrollArea className="h-[calc(100vh-400px)]">
                      <RadioGroup value={selectedBestie} onValueChange={setSelectedBestie} className="space-y-4 pr-4">
                      {besties.map((bestie) => (
                        <Card 
                          key={bestie.id} 
                          id={`bestie-${bestie.id}`}
                          className={`cursor-pointer transition-all ${selectedBestie === bestie.id ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
                        >
                          <CardContent className="p-4" onClick={() => setSelectedBestie(bestie.id)}>
                            <div className="flex items-start gap-4">
                              <RadioGroupItem value={bestie.id} id={bestie.id} className="mt-1" />
                              <img src={bestie.image_url} alt={bestie.bestie_name} className="w-20 h-20 rounded-lg object-cover" />
                              <div className="flex-1">
                                <Label htmlFor={bestie.id} className="text-lg font-bold cursor-pointer">
                                  {bestie.bestie_name}
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                                  {bestie.text_sections && bestie.text_sections.length > 0 
                                    ? bestie.text_sections[0].text 
                                    : "No description available"}
                                </p>
                                
                                {bestie.monthly_goal && bestie.monthly_goal > 0 && fundingProgress[bestie.id] && (
                                  <div className="mt-3">
                                    <FundingProgressBar
                                      currentAmount={fundingProgress[bestie.id].current_monthly_pledges}
                                      goalAmount={fundingProgress[bestie.id].monthly_goal}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      </RadioGroup>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Sponsorship Options */}

              <Card className="border-2 shadow-xl">
                <CardContent className="p-8 space-y-6">
                  <h2 className="text-2xl font-black flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-secondary" />
                    Sponsorship Details
                  </h2>

                  {/* Frequency Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Sponsorship Type</Label>
                    <RadioGroup value={frequency} onValueChange={(value) => setFrequency(value as "one-time" | "monthly")} className="grid grid-cols-2 gap-4">
                      <Card className={`cursor-pointer transition-all ${frequency === "monthly" ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
                        <CardContent className="p-4 text-center" onClick={() => setFrequency("monthly")}>
                          <RadioGroupItem value="monthly" id="monthly" className="sr-only" />
                          <Label htmlFor="monthly" className="cursor-pointer">
                            <Heart className="w-8 h-8 text-primary mx-auto mb-2 fill-primary" />
                            <div className="font-bold">Monthly</div>
                            <div className="text-xs text-muted-foreground">Recurring support</div>
                          </Label>
                        </CardContent>
                      </Card>
                      <Card className={`cursor-pointer transition-all ${frequency === "one-time" ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
                        <CardContent className="p-4 text-center" onClick={() => setFrequency("one-time")}>
                          <RadioGroupItem value="one-time" id="one-time" className="sr-only" />
                          <Label htmlFor="one-time" className="cursor-pointer">
                            <Heart className="w-8 h-8 text-primary mx-auto mb-2" />
                            <div className="font-bold">One-Time</div>
                            <div className="text-xs text-muted-foreground">Single donation</div>
                          </Label>
                        </CardContent>
                      </Card>
                    </RadioGroup>
                  </div>

                  {/* Amount Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Sponsorship Amount</Label>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {presetAmounts.map((preset) => (
                        <Button key={preset} variant={amount === preset ? "default" : "outline"} onClick={() => setAmount(preset)} className="font-bold">
                          ${preset}
                        </Button>
                      ))}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                      <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-8 text-lg font-bold" placeholder="Custom amount" min="10" step="1" />
                    </div>
                  </div>

                  {/* Login Prompt for Non-Logged-In Users */}
                  {!isLoggedIn && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Heart className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-semibold">Already have an account?</p>
                          <p className="text-xs text-muted-foreground">
                            Log in to track your sponsorships, view updates, and manage your giving in one place.
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              const redirectUrl = selectedBestie 
                                ? `/auth?redirect=/sponsor-bestie&bestieId=${selectedBestie}`
                                : `/auth?redirect=/sponsor-bestie`;
                              navigate(redirectUrl);
                            }}
                            className="mt-2"
                          >
                            Log In
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Email Input */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Your Email</Label>
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="your@email.com" 
                      className="text-base"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {isLoggedIn 
                        ? "We'll send your sponsorship receipt to this email" 
                        : "Don't have an account? You can sponsor as a guest and create one later to view your sponsorships."}
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button onClick={handleSponsorship} disabled={loading || !selectedBestie || !email || !amount} size="lg" className="w-full shadow-warm hover:shadow-glow transition-all hover:scale-105 bg-gradient-warm border-0">
                    {loading ? "Processing..." : `Sponsor with $${amount} ${frequency === "monthly" ? "/month" : ""}`}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>

                  {frequency === "monthly" && (
                    <div className="flex items-start gap-2 text-sm bg-accent/10 rounded-lg px-4 py-3 border border-accent/20">
                      <Sparkles className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-accent">Monthly sponsors</span> receive exclusive updates and photos from the Bestie they sponsor!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
        );
      
      case 'impact_info':
        return (
          <Card className="border-2 shadow-xl mt-8 bg-gradient-card" key="impact_info">
              <CardContent className="p-8">
                <h3 className="text-2xl font-black mb-6 text-center">Your Sponsorship Impact</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Heart className="w-8 h-8 text-primary" />
                    </div>
                    <h4 className="font-bold">Direct Support</h4>
                    <p className="text-sm text-muted-foreground">100% of your sponsorship goes directly to supporting your chosen Bestie's programs and activities</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                      <Users className="w-8 h-8 text-secondary" />
                    </div>
                    <h4 className="font-bold">Community Connection</h4>
                    <p className="text-sm text-muted-foreground">Help build meaningful relationships and create opportunities for growth and friendship</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-8 h-8 text-accent" />
                    </div>
                    <h4 className="font-bold">Lasting Change</h4>
                    <p className="text-sm text-muted-foreground">Create sustainable impact through consistent support and engagement</p>
                  </div>
                </div>
              </CardContent>
            </Card>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-40 left-20 w-96 h-96 bg-secondary/30 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
        </div>

        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Admin-only Stripe mode switcher */}
            {(userRole === 'admin' || userRole === 'owner') && (
              <div className="mb-8">
                <StripeModeSwitcher />
              </div>
            )}
            
            {sections.map((section) => renderSection(section.section_key))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SponsorBestie;
