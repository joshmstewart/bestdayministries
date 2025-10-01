import { Card } from "@/components/ui/card";
import communityPromCelebration from "@/assets/community-prom-celebration.png";
import communityMemberLawnMower from "@/assets/community-member-lawn-mower.jpg";
import foundersTeam from "@/assets/founders-team.jpg";
import communitySunCostume from "@/assets/community-sun-costume.jpg";

const CommunityGallery = () => {
  const images = [
    {
      src: communityPromCelebration,
      alt: "Community members celebrating at prom event",
      caption: "Celebrating life's special moments together"
    },
    {
      src: communityMemberLawnMower,
      alt: "Community member proudly working with lawn equipment",
      caption: "Building independence through meaningful work"
    },
    {
      src: foundersTeam,
      alt: "Joy House founders and team",
      caption: "The heart behind Joy House"
    },
    {
      src: communitySunCostume,
      alt: "Community member spreading joy in creative costume",
      caption: "Expressing creativity and spreading smiles"
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Our Community in Action
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See the joy, creativity, and growth happening every day at Joy House
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {images.map((image, index) => (
            <Card 
              key={index}
              className="overflow-hidden border-2 hover:shadow-warm transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative aspect-[3/4] overflow-hidden">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
              <div className="p-4 bg-card">
                <p className="text-sm text-muted-foreground text-center font-medium">
                  {image.caption}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CommunityGallery;
