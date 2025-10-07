import { useState, useEffect } from "react";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { SponsorBestieDisplay } from "@/components/SponsorBestieDisplay";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Gift, ShoppingBag, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WishlistSettings {
  amazon_wishlist_url?: string;
  walmart_wishlist_url?: string;
}

const SupportUs = () => {
  const [wishlistSettings, setWishlistSettings] = useState<WishlistSettings>({});

  useEffect(() => {
    loadWishlistSettings();
  }, []);

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

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 pt-6">
        <div className="container mx-auto px-4 py-8 space-y-16">
          {/* Header */}
          <div className="text-center space-y-4 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-4">
              <Heart className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Support Our Mission</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-foreground">
              Ways to{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Support Us
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your support empowers adults with disabilities through community, creativity, and opportunity
            </p>
          </div>

          {/* Sponsor a Bestie Section */}
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black">Sponsor a Bestie</h2>
              <p className="text-muted-foreground">Make a direct impact by sponsoring a community member's journey</p>
            </div>
            <SponsorBestieDisplay canLoad={true} />
          </div>

          {/* Other Ways to Give */}
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black">Other Ways to Give</h2>
              <p className="text-muted-foreground">Choose the giving option that works best for you</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* One-Time Donation */}
              <Card className="border-2 bg-card hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 shadow-float hover:shadow-warm group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="p-8 space-y-4 relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Heart className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-black">One-Time Gift</h3>
                  <p className="text-muted-foreground">
                    Make a one-time contribution to support our mission and help us reach our goals
                  </p>
                  <Button 
                    size="lg" 
                    className="w-full shadow-warm hover:shadow-glow transition-all hover:scale-105 bg-gradient-warm border-0"
                    onClick={() => window.location.href = '/sponsor-bestie'}
                  >
                    Donate Now
                  </Button>
                </CardContent>
              </Card>

              {/* Monthly Club */}
              <Card className="border-2 bg-card hover:border-secondary/50 transition-all duration-500 hover:-translate-y-2 shadow-float hover:shadow-warm group overflow-hidden relative">
                <div className="absolute top-4 right-4 bg-gradient-to-r from-primary via-accent to-secondary text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                  ⭐ POPULAR
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-accent/5 opacity-100 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="p-8 space-y-4 relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary/20 to-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Heart className="w-8 h-8 text-secondary fill-secondary" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-black">Best Day Ministries Club</h3>
                  </div>
                  <p className="text-muted-foreground">
                    Join the club! Monthly donations help us grow our mission consistently
                  </p>
                  <Button 
                    size="lg" 
                    className="w-full shadow-warm hover:shadow-glow transition-all hover:scale-105 bg-gradient-warm border-0"
                    onClick={() => window.location.href = '/sponsor-bestie'}
                  >
                    Join the Club
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Wishlists Section */}
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black">Shop Our Wishlists</h2>
              <p className="text-muted-foreground">Purchase items we need directly from our wishlists</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Amazon Wishlist */}
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

              {/* Walmart Wishlist */}
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

          {/* Impact Section */}
          <Card className="border-2 shadow-float bg-gradient-card max-w-4xl mx-auto">
            <CardContent className="p-8">
              <h4 className="font-black text-2xl mb-6 text-center">Your Support Makes a Difference</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary font-bold">✓</span>
                  </span>
                  <span className="text-muted-foreground text-lg">Bestie mentoring and job training programs</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary font-bold">✓</span>
                  </span>
                  <span className="text-muted-foreground text-lg">Career development and entrepreneurial opportunities</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary font-bold">✓</span>
                  </span>
                  <span className="text-muted-foreground text-lg">Community events and crafting nights</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary font-bold">✓</span>
                  </span>
                  <span className="text-muted-foreground text-lg">Expanding Best Day Ministries locations nationwide</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SupportUs;

