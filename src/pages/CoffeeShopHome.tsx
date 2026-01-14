import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import CoffeeShopMenu from "@/components/CoffeeShopMenu";
import { Button } from "@/components/ui/button";
import { Coffee, Users, Heart, MapPin, Clock, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isProblematicIOSVersion } from "@/lib/browserDetection";

interface CoffeeShopContent {
  hero_heading?: string;
  hero_subheading?: string;
  hero_image_url?: string;
  mission_title?: string;
  mission_description?: string;
  menu_button_text?: string;
  menu_button_link?: string;
  menu_button_link_type?: "internal" | "custom";
  about_button_text?: string;
  about_button_link?: string;
  about_button_link_type?: "internal" | "custom";
  hours_title?: string;
  hours_content?: string;
  address?: string;
  phone?: string;
  show_menu?: boolean;
}

const CoffeeShopHome = () => {
  const [content, setContent] = useState<CoffeeShopContent>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-coffee-shop-content");
      if (error) throw error;

      const raw = (data as any)?.content;
      if (raw) {
        setContent(typeof raw === "string" ? JSON.parse(raw) : raw);
      }
    } catch (error) {
      console.error("Error loading coffee shop content:", error);
    } finally {
      setLoading(false);
    }
  };

  const {
    hero_heading = "Coffee with Purpose. Community with Heart.",
    hero_subheading = "Welcome to Best Day Ever Coffee & Crepes, where every cup and crepe creates opportunities for adults with disabilities in Longmont.",
    hero_image_url = "/images/bestie_and_friend.jpg",
    mission_title = "Our Mission",
    mission_description = "At Best Day Ever, we believe in creating opportunities and fostering independence for adults with disabilities through meaningful employment in a joyful café environment. Our Besties are the heart of our café, bringing smiles and warmth to every cup of coffee and crepe we serve.",
    menu_button_text = "View Our Menu",
    menu_button_link = "#menu",
    menu_button_link_type = "custom" as const,
    about_button_text = "Meet Our Besties",
    about_button_link = "/about",
    about_button_link_type = "internal" as const,
    hours_title = "Visit Us",
    hours_content = "Monday - Friday: 7am - 2pm\nSaturday: 8am - 2pm\nSunday: Closed",
    address = "123 Main Street, Longmont, CO",
    phone = "(555) 123-4567",
    show_menu = true
  } = content;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 backdrop-blur-sm rounded-full border border-accent/20">
                <Coffee className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-accent">Best Day Ever Coffee & Crepes</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground leading-tight">
                {hero_heading}
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                {hero_subheading}
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg"
                  className="bg-gradient-warm shadow-warm hover:shadow-glow"
                  onClick={() => {
                    if (menu_button_link_type === "internal") {
                      window.location.href = menu_button_link;
                    } else {
                      if (menu_button_link.startsWith("#")) {
                        document.querySelector(menu_button_link)?.scrollIntoView({ behavior: "smooth" });
                      } else {
                        window.open(menu_button_link, "_blank");
                      }
                    }
                  }}
                >
                  {menu_button_text}
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    if (about_button_link_type === "internal") {
                      window.location.href = about_button_link;
                    } else {
                      window.open(about_button_link, "_blank");
                    }
                  }}
                >
                  {about_button_text}
                </Button>
              </div>
            </div>
            
            <div className="relative animate-scale-in">
              <div className={`absolute -inset-8 bg-gradient-warm rounded-[3rem] ${!isProblematicIOSVersion() ? 'rotate-3' : ''} opacity-20 blur-2xl`} />
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/40 via-accent/30 to-secondary/40 rounded-[2.5rem] blur-xl" />
                <div className="relative rounded-[2rem] overflow-hidden shadow-xl border-4 border-white/50">
                  <img
                    src={hero_image_url}
                    alt="Best Day Ever Coffee & Crepes"
                    className="w-full h-auto object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800";
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-gradient-card">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">
              {mission_title}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {mission_description}
            </p>
          </div>
        </div>
      </section>

      {/* Info Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Hours */}
            <div className="bg-card border-2 border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{hours_title}</h3>
              </div>
              <p className="text-muted-foreground whitespace-pre-line">
                {hours_content}
              </p>
            </div>

            {/* Location */}
            <div className="bg-card border-2 border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Location</h3>
              </div>
              <p className="text-muted-foreground">
                {address}
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank')}
              >
                Get Directions
              </Button>
            </div>

            {/* Contact */}
            <div className="bg-card border-2 border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Contact</h3>
              </div>
              <p className="text-muted-foreground">
                {phone}
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = `tel:${phone.replace(/\D/g, '')}`}
              >
                Call Us
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Section */}
      {show_menu && <CoffeeShopMenu />}

      {/* Community Link */}
      <section className="py-16 bg-gradient-to-br from-secondary/5 via-background to-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">
              Part of Best Day Ministries
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Learn more about our community programs and how we're creating opportunities for adults with disabilities.
            </p>
            <Button 
              size="lg"
              className="bg-gradient-warm shadow-warm hover:shadow-glow"
              onClick={() => window.location.href = '/about'}
            >
              Explore Our Community
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CoffeeShopHome;
