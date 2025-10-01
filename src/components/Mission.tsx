import { Card, CardContent } from "@/components/ui/card";
import { Heart, Users, Sparkles, HandHeart, TrendingUp, Award } from "lucide-react";
import communityMemberWithKitten from "@/assets/community-member-with-kitten.jpg";
import communityMemberWithVolunteer from "@/assets/community-member-with-volunteer.jpg";

const Mission = () => {
  const benefits = [
    {
      icon: Users,
      title: "Bestie Mentoring",
      description: "Teaching Besties job & life skills for greater independence",
      color: "from-primary/20 to-primary/5"
    },
    {
      icon: Sparkles,
      title: "Career Opportunities",
      description: "Equipping Besties with entrepreneurial skillsets",
      color: "from-secondary/20 to-secondary/5"
    },
    {
      icon: Heart,
      title: "Community Events",
      description: "Planning and funding events to cultivate community",
      color: "from-accent/20 to-accent/5"
    },
    {
      icon: HandHeart,
      title: "Crafting Nights",
      description: "Funding supplies for weekly Bestie crafting events",
      color: "from-primary/20 to-secondary/5"
    },
  ];

  return (
    <section id="mission" className="py-24 bg-gradient-to-b from-background via-muted/20 to-background relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-40 left-10 w-72 h-72 bg-secondary/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 space-y-4 animate-fade-in">
          <div className="inline-block px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-4">
            <span className="text-sm font-semibold text-primary">Our Impact</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-foreground">
            Mission & Impact
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Empowering adults with special needs through creativity, community, and meaningful opportunities
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-16">
          {/* Large Stats Card */}
          <Card className="lg:col-span-5 border-2 hover:border-primary/50 transition-all duration-500 shadow-float hover:shadow-warm group overflow-hidden">
            <CardContent className="p-8 h-full relative">
              <div className="absolute inset-0 bg-gradient-warm opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
              <div className="relative space-y-6 h-full flex flex-col justify-between">
                <div>
                  <TrendingUp className="w-12 h-12 text-primary mb-4" />
                  <h3 className="text-3xl font-black mb-6 text-foreground">
                    Making Real Impact
                  </h3>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <div className="text-5xl font-black bg-gradient-warm bg-clip-text text-transparent">4.8%</div>
                      <Award className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-muted-foreground">
                      of U.S. adults aged 21-64 have a cognitive disability
                    </p>
                  </div>
                  
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <div className="text-5xl font-black bg-gradient-warm bg-clip-text text-transparent">78.7%</div>
                      <Award className="w-6 h-6 text-secondary" />
                    </div>
                    <p className="text-muted-foreground">
                      of adults with disabilities are unemployed in the United States
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefits Grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card 
                  key={index} 
                  className="border-2 hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 shadow-float hover:shadow-warm group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-6 h-full">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-foreground">{benefit.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Mission Statement with Images */}
        <Card className="border-2 shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <div className="grid lg:grid-cols-2 gap-0">
              <div className="p-8 lg:p-12 bg-gradient-card space-y-6 flex flex-col justify-center">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-warm flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white fill-white" />
                  </div>
                  <h3 className="text-3xl font-black text-foreground">Our Mission</h3>
                  <p className="text-lg font-semibold text-foreground leading-relaxed">
                    "To build a supportive community for special adults by sharing their creativity through their unique gifts."
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    By doing so, we give them the opportunity to light the world with their elevated confidence, independence, and JOY!
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 p-2 bg-muted/20">
                <div className="relative aspect-square rounded-2xl overflow-hidden group">
                  <img 
                    src={communityMemberWithKitten}
                    alt="Community member enjoying time with a kitten"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="relative aspect-square rounded-2xl overflow-hidden group">
                  <img 
                    src={communityMemberWithVolunteer}
                    alt="Community member with volunteer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default Mission;
