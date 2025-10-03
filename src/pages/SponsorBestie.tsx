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

interface Bestie {
  id: string;
  bestie_name: string;
  image_url: string;
  description: string;
  monthly_goal: number | null;
}

interface FundingProgress {
  featured_bestie_id: string;
  current_monthly_pledges: number;
  monthly_goal: number;
  funding_percentage: number;
}

const sponsorshipSchema = z.object({
  amount: z.number().min(10, "Minimum sponsorship is $10"),
  email: z.string().email("Invalid email address"),
});

const SponsorBestie = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [besties, setBesties] = useState<Bestie[]>([]);
  const [fundingProgress, setFundingProgress] = useState<Record<string, FundingProgress>>({});
  const [selectedBestie, setSelectedBestie] = useState<string>("");
  const [frequency, setFrequency] = useState<"one-time" | "monthly">("monthly");
  const [amount, setAmount] = useState<string>("25");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    loadBesties();
    checkAuthAndLoadEmail();
  }, []);

  useEffect(() => {
    // Check if there's a bestie ID in the URL
    const bestieId = searchParams.get('bestie');
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
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, role")
        .eq("id", user.id)
        .single();
      
      // Block besties from sponsoring
      if (profile?.role === "bestie") {
        toast.error("Besties cannot sponsor other besties at this time");
        navigate("/community");
        return;
      }
      
      if (profile?.email) {
        setEmail(profile.email);
      }
    }
  };

  const loadBesties = async () => {
    const { data, error } = await supabase
      .from("featured_besties")
      .select("id, bestie_name, image_url, description, monthly_goal")
      .eq("is_active", true)
      .eq("approval_status", "approved")
      .eq("available_for_sponsorship", true)
      .eq("is_fully_funded", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading besties:", error);
      return;
    }

    setBesties(data || []);
    if (data && data.length > 0) {
      setSelectedBestie(data[0].id);
    }
  };

  const loadFundingProgress = async () => {
    const { data, error } = await supabase
      .from("bestie_funding_progress")
      .select("*");

    if (error) {
      console.error("Error loading funding progress:", error);
      return;
    }

    // Create a map of bestie ID to funding progress
    const progressMap: Record<string, FundingProgress> = {};
    data?.forEach(progress => {
      progressMap[progress.featured_bestie_id] = progress;
    });
    setFundingProgress(progressMap);
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

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating sponsorship:", error);
      toast.error("Failed to start sponsorship. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const presetAmounts = ["10", "25", "50", "100"];

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
            {/* Header */}
            <div className="text-center mb-8 space-y-3 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-2">
                <Heart className="w-3 h-3 text-primary" />
                <span className="text-xs font-semibold text-primary">Sponsor a Bestie</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-foreground">
                Change a{" "}
                <span className="bg-gradient-text bg-clip-text text-transparent">
                  Life Today
                </span>
              </h1>
              <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                Sponsor a Bestie and directly support their journey of growth, creativity, and community engagement
              </p>
            </div>

            {/* Main Content */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Bestie Selection */}
              <Card className="border-2 shadow-xl">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                    <Users className="w-6 h-6 text-primary" />
                    Select a Bestie
                  </h2>

                  {besties.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No besties available for sponsorship at this time.</p>
                  ) : (
                    <RadioGroup value={selectedBestie} onValueChange={setSelectedBestie} className="space-y-4">
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
                                <p className="text-sm text-muted-foreground mt-1">{bestie.description}</p>
                                
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

                  {/* Email Input */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Your Email</Label>
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="your@email.com" 
                      className="text-base"
                      disabled={isLoggedIn}
                    />
                    <p className="text-xs text-muted-foreground">
                      {isLoggedIn 
                        ? "Using your account email" 
                        : "We'll send your sponsorship receipt and updates to this email"}
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

            {/* Impact Info */}
            <Card className="border-2 shadow-xl mt-8 bg-gradient-card">
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
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SponsorBestie;
