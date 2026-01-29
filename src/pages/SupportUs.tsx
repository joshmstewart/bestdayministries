import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { SponsorBestieDisplay } from "@/components/SponsorBestieDisplay";
import { DonationForm } from "@/components/DonationForm";
import VideoSection from "@/components/VideoSection";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Gift, ShoppingBag, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackDonationComplete } from "@/lib/analytics";

interface WishlistSettings {
  amazon_wishlist_url?: string;
  walmart_wishlist_url?: string;
}

interface SupportPageSection {
  id: string;
  section_key: string;
  section_name: string;
  display_order: number;
  is_visible: boolean;
  content: Record<string, any>;
}

interface WayToGive {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient_from: string;
  gradient_to: string;
  icon_gradient_from: string;
  icon_gradient_to: string;
  hover_border_color: string;
  button_text: string;
  button_url: string;
  is_popular: boolean;
  is_active: boolean;
}

const SupportUs = () => {
  const [searchParams] = useSearchParams();
  const [wishlistSettings, setWishlistSettings] = useState<WishlistSettings>({});
  const [sections, setSections] = useState<SupportPageSection[]>([]);
  const [waysToGive, setWaysToGive] = useState<WayToGive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWishlistSettings();
    loadSections();
    loadWaysToGive();
    
    // Track donation completion if redirected from successful payment
    const donationStatus = searchParams.get("donation");
    if (donationStatus === "success") {
      trackDonationComplete("donation");
    }
  }, [searchParams]);

  const loadWishlistSettings = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "support_wishlist_urls")
      .maybeSingle();

    if (data?.setting_value) {
      setWishlistSettings(data.setting_value as WishlistSettings);
    }
  };

  const loadSections = async () => {
    try {
      const { data, error } = await supabase
        .from("support_page_sections")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      if (data) setSections(data as SupportPageSection[]);
    } catch (error) {
      // Silently handle error, allow page to render with defaults
    } finally {
      setLoading(false);
    }
  };

  const loadWaysToGive = async () => {
    try {
      const { data, error } = await supabase
        .from("ways_to_give")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      if (data) setWaysToGive(data as WayToGive[]);
    } catch (error) {
      console.error("Error loading ways to give:", error);
    }
  };

  const getSection = (key: string) => {
    return sections.find(s => s.section_key === key && s.is_visible);
  };

  const renderSection = (sectionKey: string) => {
    const section = getSection(sectionKey);
    if (!section) return null;

    switch (sectionKey) {
      case 'header':
        return (
          <div key="header" className="text-center space-y-4 animate-fade-in">
            {section.content.badge_text && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-4">
                <Heart className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">{section.content.badge_text}</span>
              </div>
            )}
            <h1 className="text-4xl md:text-6xl font-black text-foreground">
              {section.content.heading?.split(" ").map((word: string, i: number) => 
                i === section.content.heading.split(" ").length - 2 ? (
                  <span key={i} className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                    {word}{" "}
                  </span>
                ) : word + " "
              )}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {section.content.subtitle}
            </p>
          </div>
        );

      case 'donation_form':
        return (
          <div key="donation_form" className="space-y-6">
            <div className="text-center space-y-2">
              {section.content.title && (
                <h2 className="text-3xl font-black">{section.content.title}</h2>
              )}
              {section.content.description && (
                <p className="text-muted-foreground">{section.content.description}</p>
              )}
            </div>
            <DonationForm />
          </div>
        );

      case 'support_video':
        return (
          <div key="support_video">
            <VideoSection content={section.content} />
          </div>
        );

      case 'sponsor_bestie':
        return (
          <div key="sponsor_bestie" className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black">{section.content.title}</h2>
              <p className="text-muted-foreground">{section.content.description}</p>
            </div>
            <SponsorBestieDisplay canLoad={true} />
          </div>
        );

      case 'other_ways':
        return waysToGive.length > 0 ? (
          <div key="other_ways" className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black">{section.content.title}</h2>
              <p className="text-muted-foreground">{section.content.description}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {waysToGive.map((way) => {
                const IconComponent = way.icon === 'Gift' ? Gift : Heart;
                
                return (
                  <Card 
                    key={way.id}
                    className={`border-2 bg-card hover:border-${way.hover_border_color} transition-all duration-500 hover:-translate-y-2 shadow-float hover:shadow-warm group overflow-hidden ${way.is_popular ? 'relative' : ''}`}
                  >
                    {way.is_popular && (
                      <div className="absolute top-4 right-4 bg-gradient-to-r from-primary via-accent to-secondary text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                        ⭐ POPULAR
                      </div>
                    )}
                    <div className={`absolute inset-0 bg-gradient-to-r from-${way.gradient_from} via-${way.gradient_to} to-${way.gradient_to} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    <CardContent className="p-8 space-y-4 relative">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-${way.icon_gradient_from} to-${way.icon_gradient_to} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className={`w-8 h-8 text-${way.icon_gradient_from.split('/')[0]}`} />
                      </div>
                      <h3 className="text-2xl font-black">{way.title}</h3>
                      <p className="text-muted-foreground">{way.description}</p>
                      <Button 
                        size="lg" 
                        className="w-full shadow-warm hover:shadow-glow transition-all hover:scale-105 bg-gradient-warm border-0"
                        onClick={() => {
                          if (way.button_url.startsWith('http')) {
                            window.open(way.button_url, '_blank', 'noopener,noreferrer');
                          } else {
                            window.location.href = way.button_url;
                          }
                        }}
                      >
                        {way.button_text}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : null;

      case 'wishlists':
        return (wishlistSettings.amazon_wishlist_url || wishlistSettings.walmart_wishlist_url) ? (
          <div key="wishlists" className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black">{section.content.title}</h2>
              <p className="text-muted-foreground">{section.content.description}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {wishlistSettings.amazon_wishlist_url && (
                <Card className="border-2 bg-card hover:border-accent/50 transition-all duration-500 hover:-translate-y-2 shadow-float hover:shadow-warm group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardContent className="p-8 space-y-4 relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <ShoppingBag className="w-8 h-8 text-accent" />
                    </div>
                    <h3 className="text-2xl font-black">Amazon Wishlist</h3>
                    <p className="text-muted-foreground">
                      Browse and purchase items we need from our Amazon wishlist
                    </p>
                    <Button 
                      size="lg" 
                      className="w-full shadow-warm hover:shadow-glow transition-all hover:scale-105 bg-gradient-warm border-0"
                      onClick={() => window.open(wishlistSettings.amazon_wishlist_url, '_blank', 'noopener,noreferrer')}
                    >
                      <span className="flex items-center gap-2">
                        View Wishlist
                        <ExternalLink className="w-4 h-4" />
                      </span>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {wishlistSettings.walmart_wishlist_url && (
                <Card className="border-2 bg-card hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 shadow-float hover:shadow-warm group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardContent className="p-8 space-y-4 relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Gift className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-black">Walmart Wishlist</h3>
                    <p className="text-muted-foreground">
                      Browse and purchase items we need from our Walmart registry
                    </p>
                    <Button 
                      size="lg" 
                      className="w-full shadow-warm hover:shadow-glow transition-all hover:scale-105 bg-gradient-warm border-0"
                      onClick={() => window.open(wishlistSettings.walmart_wishlist_url, '_blank', 'noopener,noreferrer')}
                    >
                      <span className="flex items-center gap-2">
                        View Registry
                        <ExternalLink className="w-4 h-4" />
                      </span>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : null;

      case 'impact':
        return (
          <Card key="impact" className="border-2 shadow-float bg-gradient-card max-w-4xl mx-auto">
            <CardContent className="p-8">
              <h4 className="font-black text-2xl mb-6 text-center">{section.content.title}</h4>
              <ul className="space-y-4">
                {(section.content.items || []).map((item: string, index: number) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary font-bold">✓</span>
                    </span>
                    <span className="text-muted-foreground text-lg">{item}</span>
                  </li>
                ))}
              </ul>
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
      
      <main className="flex-1 pt-24">
        <div className="container mx-auto px-4 py-8 space-y-16">
          {sections.map(section => renderSection(section.section_key))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SupportUs;
