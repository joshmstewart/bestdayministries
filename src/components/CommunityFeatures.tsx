import { Card, CardContent } from "@/components/ui/card";
import { Heart, Calendar, MessageSquare, Users, Gift, Link2, Volume2, Shield } from "lucide-react";

interface CommunityFeaturesContent {
  badge_text?: string;
  title?: string;
  subtitle?: string;
}

interface CommunityFeaturesProps {
  content?: CommunityFeaturesContent;
}

const CommunityFeatures = ({ content = {} }: CommunityFeaturesProps) => {
  const {
    badge_text = "Platform Features",
    title = "Join Our Community",
    subtitle = "Connect, create, and celebrate together",
  } = content;
  const features = [
    {
      icon: Heart,
      title: "Featured Bestie of the Month",
      description: "Celebrate a community member with their story, photos, and voice notes that everyone can hear and support",
      gradient: "from-primary/20 to-primary/5"
    },
    {
      icon: Calendar,
      title: "Community Events",
      description: "Join virtual and in-person events, workshops, and gatherings designed for connection and fun",
      gradient: "from-secondary/20 to-secondary/5"
    },
    {
      icon: MessageSquare,
      title: "Discussions & Forums",
      description: "Share experiences, ask questions, and support each other in safe, moderated spaces",
      gradient: "from-accent/20 to-accent/5"
    },
    {
      icon: Gift,
      title: "Sponsor a Bestie",
      description: "Make a direct impact by sponsoring community members and supporting their independence journey",
      gradient: "from-primary/20 to-secondary/5"
    },
    {
      icon: Link2,
      title: "Family Connections",
      description: "Guardians can link to their Besties' accounts to stay connected and provide support when needed",
      gradient: "from-secondary/20 to-accent/5"
    },
    {
      icon: Volume2,
      title: "Audio Notifications",
      description: "Besties can enable audio notifications for an accessible, easy-to-use experience",
      gradient: "from-accent/20 to-primary/5"
    },
    {
      icon: Users,
      title: "Mutual Support Network",
      description: "Guardians and supporters connect with each other for advice, encouragement, and shared experiences",
      gradient: "from-primary/20 to-accent/5"
    },
    {
      icon: Shield,
      title: "AI-Moderated Safety",
      description: "Our AI helps ensure all content follows community guidelines, keeping the space positive and safe",
      gradient: "from-secondary/20 to-primary/5"
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-background via-muted/20 to-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-4">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">{badge_text}</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-foreground">
            {title.split(' ').map((word, i) => 
              ['Connect', 'connect', 'Community', 'community'].includes(word) ? (
                <span key={i} className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">{word} </span>
              ) : (
                word + ' '
              )
            )}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="border-2 hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 shadow-float hover:shadow-warm group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-6 h-full">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CommunityFeatures;
