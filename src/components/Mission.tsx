import { Card, CardContent } from "@/components/ui/card";
import { Heart, Users, Sparkles, HandHeart } from "lucide-react";
import communityMemberWithKitten from "@/assets/community-member-with-kitten.jpg";
import communityMemberWithVolunteer from "@/assets/community-member-with-volunteer.jpg";
import communityMemberLawnMower from "@/assets/community-member-lawn-mower.jpg";
import communityPromCelebration from "@/assets/community-prom-celebration.png";

const Mission = () => {
  const benefits = [
    {
      icon: Users,
      title: "Bestie Mentoring",
      description: "Teaching Besties job & life skills for greater independence",
    },
    {
      icon: Sparkles,
      title: "Career Opportunities",
      description: "Equipping Besties with entrepreneurial skillsets",
    },
    {
      icon: Heart,
      title: "Community Events",
      description: "Planning and funding events to cultivate community for those with special needs",
    },
    {
      icon: HandHeart,
      title: "Crafting Nights",
      description: "Funding supplies for weekly Bestie crafting events",
    },
  ];

  return (
    <section id="mission" className="py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Our Mission & Impact
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We're dedicated to empowering adults with special needs through creativity, community, and meaningful opportunities
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <Card 
                key={index} 
                className="border-2 hover:border-primary hover:shadow-warm transition-all duration-300 hover:-translate-y-1"
              >
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="bg-card rounded-2xl p-8 md:p-12 shadow-soft border border-border">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-foreground">
                Did You Know?
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="text-4xl font-bold text-primary">4.8%</div>
                  <p className="text-muted-foreground">
                    of U.S. adults aged 21-64 have a cognitive disability
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="text-4xl font-bold text-primary">78.7%</div>
                  <p className="text-muted-foreground">
                    of adults with disabilities are unemployed in the United States
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-muted/50 rounded-xl p-8 space-y-4">
                <p className="text-lg font-semibold text-foreground">
                  "Our mission is to build a supportive community for special adults by sharing their creativity through their unique gifts."
                </p>
                <p className="text-muted-foreground">
                  By doing so, we give them the opportunity to light the world with their elevated confidence, independence, and JOY!
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <img 
                  src={communityMemberWithKitten}
                  alt="Community member enjoying time with a kitten"
                  className="rounded-xl object-cover w-full h-48 shadow-soft"
                />
                <img 
                  src={communityMemberWithVolunteer}
                  alt="Community member with volunteer"
                  className="rounded-xl object-cover w-full h-48 shadow-soft"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Mission;
