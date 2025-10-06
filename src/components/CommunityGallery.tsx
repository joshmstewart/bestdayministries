import { Card } from "@/components/ui/card";
import { Camera, ArrowRight } from "lucide-react";
import communityPromCelebration from "@/assets/community-prom-celebration.png";
import communityMemberLawnMower from "@/assets/community-member-lawn-mower.jpg";
import foundersTeam from "@/assets/founders-team.jpg";
import communitySunCostume from "@/assets/community-sun-costume.jpg";

interface CommunityGalleryContent {
  badge_text?: string;
  title?: string;
  subtitle?: string;
}

interface CommunityGalleryProps {
  content?: CommunityGalleryContent;
}

const CommunityGallery = ({ content = {} }: CommunityGalleryProps) => {
  const {
    badge_text = "Community Snapshots",
    title = "Our Community in Action",
    subtitle = "Celebrating moments of joy, creativity, and connection",
  } = content;
  const images = [
    {
      src: communityPromCelebration,
      alt: "Community members celebrating at prom event",
      caption: "Celebrating life's special moments",
      size: "large"
    },
    {
      src: communityMemberLawnMower,
      alt: "Community member proudly working with lawn equipment",
      caption: "Building independence through work",
      size: "medium"
    },
    {
      src: foundersTeam,
      alt: "Best Day Ministries founders and team",
      caption: "The heart behind Best Day Ministries",
      size: "medium"
    },
    {
      src: communitySunCostume,
      alt: "Community member spreading joy in creative costume",
      caption: "Expressing creativity daily",
      size: "small"
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-muted/30 via-background to-muted/20 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent/30 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-secondary/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-4">
            <Camera className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">{badge_text}</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-foreground">
            {title.split(' ').map((word, i) => 
              ['Action', 'action'].includes(word) ? (
                <span key={i} className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">{word}</span>
              ) : (
                word + ' '
              )
            )}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Masonry-style grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {images.map((image, index) => (
            <Card 
              key={index}
              className={`overflow-hidden border-2 hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 shadow-float hover:shadow-warm group
                ${image.size === 'large' ? 'md:col-span-2 md:row-span-2' : ''}
                ${image.size === 'medium' ? 'md:row-span-1' : ''}`}
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                  <p className="text-white font-bold text-lg drop-shadow-lg">
                    {image.caption}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground text-lg mb-4">
            Want to be part of our story?
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-card border-2 border-primary/20 rounded-full font-semibold text-foreground hover:border-primary/50 transition-all cursor-pointer hover:scale-105">
            Join our community events
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunityGallery;
