import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import joyRocksImage from "@/assets/joy-rocks.jpg";
import { supabase } from "@/integrations/supabase/client";
import ImageCarousel from "@/components/ImageCarousel";

interface JoyRocksContent {
  badge_text?: string;
  heading?: string;
  paragraph1?: string;
  paragraph2?: string;
  highlight_text?: string;
  button_text?: string;
  button_url?: string;
  button_url_type?: string;
  stat_number?: string;
  stat_label?: string;
  image_url?: string;
  display_type?: string;
  album_id?: string;
}

interface JoyRocksProps {
  content?: JoyRocksContent;
}

const JoyRocks = ({ content = {} }: JoyRocksProps) => {
  const {
    badge_text = "Global Movement",
    heading = "Planting Seeds of Love Globally",
    paragraph1 = "Inspired by Bill Stewart's love for the Best Day Ministries mission, Best Day Ministries Rocks creates a fun and engaging activity that brings people together to promote positivity and joy.",
    paragraph2 = "Through rock painting, we provide a creative outlet for all! Once decorated, rocks can be gifted or placed in public areas for others to find. The new owner can keep it as a reminder of kindness, or hide it for someone else to discover.",
    highlight_text = "Each rock's journey spreads our mission—one colorful rock at a time! 🎨",
    button_text = "Learn More About Joy Rocks",
    button_url = "/joy-rocks",
    button_url_type = "internal",
    stat_number = "10K+",
    stat_label = "Rocks Painted",
    image_url = joyRocksImage,
    display_type = "image",
    album_id
  } = content;

  const [albumImages, setAlbumImages] = useState<Array<{ image_url: string; caption?: string }>>([]);
  const [loadingAlbum, setLoadingAlbum] = useState(false);

  useEffect(() => {
    if (display_type === "album" && album_id) {
      const loadAlbumImages = async () => {
        setLoadingAlbum(true);
        const { data } = await supabase
          .from('album_images')
          .select('image_url, caption')
          .eq('album_id', album_id)
          .eq('moderation_status', 'approved')
          .order('display_order', { ascending: true });
        
        if (data) {
          setAlbumImages(data);
        }
        setLoadingAlbum(false);
      };
      loadAlbumImages();
    }
  }, [display_type, album_id]);

  const handleButtonClick = () => {
    if (button_url_type === "custom") {
      window.open(button_url, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = button_url || "/joy-rocks";
    }
  };

  // Extract "Love Globally" or similar for gradient styling
  const loveGloballyMatch = heading.match(/(Love Globally|[A-Z][a-z]+ [A-Z][a-z]+)$/i);
  const beforeHighlight = loveGloballyMatch ? heading.substring(0, loveGloballyMatch.index) : heading;
  const highlightText = loveGloballyMatch ? loveGloballyMatch[0] : "";

  return (
    <section id="rocks" className="py-24 bg-gradient-to-br from-secondary/5 via-background to-primary/5 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-secondary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="order-2 lg:order-1 relative animate-scale-in">
            {/* Image or Album with modern treatment */}
            <div className="absolute -inset-8 bg-gradient-warm rounded-[3rem] rotate-3 opacity-20 blur-2xl" />
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/40 via-accent/30 to-secondary/40 rounded-[2.5rem] blur-xl" />
              <div className="relative rounded-[2rem] overflow-hidden shadow-xl border-4 border-white/50">
                {display_type === "album" && albumImages.length > 0 ? (
                  <ImageCarousel 
                    images={albumImages} 
                    autoPlay={true}
                    interval={5000}
                  />
                ) : (
                  <img
                    src={image_url}
                    alt="Best Day Ministries Rocks - Painted rocks with positive messages"
                    className="w-full h-auto object-cover"
                  />
                )}
              </div>
            </div>
            
            {/* Floating badge */}
            <div className="absolute -bottom-4 -right-4 bg-card border-2 border-border rounded-2xl p-4 shadow-float backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary via-accent to-secondary flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-black text-foreground">{stat_number}</div>
                  <div className="text-sm text-muted-foreground">{stat_label}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 backdrop-blur-sm rounded-full border border-accent/20">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-accent">{badge_text}</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground leading-tight">
              {highlightText ? (
                <>
                  {beforeHighlight}
                  <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                    {highlightText}
                  </span>
                </>
              ) : (
                heading
              )}
            </h2>
            
            <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
              <p>{paragraph1}</p>
              <p>{paragraph2}</p>
              <div className="bg-gradient-card border-2 border-primary/20 rounded-2xl p-6 space-y-2">
                <p className="font-bold text-foreground text-xl">
                  {highlight_text}
                </p>
              </div>
            </div>

            <Button 
              size="lg" 
              onClick={handleButtonClick}
              className="group shadow-warm hover:shadow-glow transition-all hover:scale-105 bg-gradient-warm border-0 text-lg px-8 py-6"
            >
              {button_text}
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JoyRocks;
