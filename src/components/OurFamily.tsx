import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Coffee, Heart } from "lucide-react";

const familyOrganizations = [
  {
    name: "Best Day Ever Coffee + Crepes",
    description: "A community-centered coffee shop where everyone belongs. Delicious food and drinks served with love.",
    url: "https://bestdayevercoffeeandcrepes.com",
    icon: Coffee,
    color: "from-amber-500/20 to-orange-500/20",
  },
  {
    name: "Best Day Ever Ministries",
    description: "Our main ministry empowering adults with special needs through creativity, community, and connection.",
    url: "#about",
    icon: Heart,
    color: "from-primary/20 to-primary-variant/20",
  },
];

const OurFamily = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary-variant to-primary bg-clip-text text-transparent">
            Our Family of Organizations
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Best Day Ever Ministries is part of a vibrant family of organizations, 
            each dedicated to building community and spreading joy.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {familyOrganizations.map((org, index) => {
            const IconComponent = org.icon;
            return (
              <Card
                key={index}
                className="group p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50 bg-gradient-to-br from-card to-muted/30"
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${org.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className="w-8 h-8 text-primary" />
                </div>
                
                <h3 className="text-2xl font-bold mb-3 text-foreground">
                  {org.name}
                </h3>
                
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {org.description}
                </p>
                
                <Button
                  variant="outline"
                  className="group/btn w-full"
                  onClick={() => {
                    if (org.url.startsWith('http')) {
                      window.open(org.url, '_blank', 'noopener,noreferrer');
                    } else {
                      const element = document.querySelector(org.url);
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  <span>Visit {org.name.includes('Coffee') ? 'Website' : 'Section'}</span>
                  <ExternalLink className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default OurFamily;
