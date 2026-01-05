import { Button } from "@/components/ui/button";
import { ArrowRight, Heart, Gift, Users, ShoppingBag } from "lucide-react";
import heroImage from "@/assets/hero-hands.jpg";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useNavigate } from "react-router-dom";

const quickActions = [
  { label: "Donate", icon: Gift, path: "/support", color: "bg-primary hover:bg-primary/90" },
  { label: "Sponsor a Bestie", icon: Users, path: "/sponsor-bestie", color: "bg-secondary hover:bg-secondary/90" },
  { label: "Joy House Store", icon: ShoppingBag, path: "/joyhousestore", color: "bg-accent hover:bg-accent/90" },
];

interface HeroContent {
  badge_text?: string;
  heading?: string;
  gradient_text?: string;
  description?: string;
  button_text?: string;
  button_url?: string;
  button_url_type?: string;
  stat1_number?: string;
  stat1_label?: string;
  stat2_number?: string;
  stat2_label?: string;
  image_url?: string;
}

interface HeroProps {
  content?: HeroContent;
}

const Hero = ({ content = {} }: HeroProps) => {
  const navigate = useNavigate();
  const {
    badge_text = "Building Community Through Creativity",
    heading = "Spreading JOY through the unique gifts of the special needs community",
    gradient_text = "",
    description = "Building a supportive community for adults with special needs by sharing their creativity and giving them confidence, independence, and JOY!",
    button_text = "Join Our Community",
    button_url = "/auth?signup=true",
    button_url_type = "internal",
    stat1_number = "500+",
    stat1_label = "Community Members",
    stat2_number = "10K+",
    stat2_label = "Lives Touched",
    image_url = heroImage
  } = content;

  const handleButtonClick = () => {
    if (button_url_type === "custom") {
      window.open(button_url, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = button_url || "/auth?signup=true";
    }
  };

  // Extract gradient text if specified
  const gradientTextUpper = gradient_text?.toUpperCase() || "";
  const headingUpper = heading.toUpperCase();
  const gradientIndex = gradientTextUpper ? headingUpper.indexOf(gradientTextUpper) : -1;
  const beforeGradient = gradientIndex > -1 ? heading.substring(0, gradientIndex) : heading;
  const afterGradient = gradientIndex > -1 ? heading.substring(gradientIndex + gradient_text.length) : "";
  const hasGradient = gradientIndex > -1 && gradient_text;

  return (
    <section className="relative min-h-[70vh] flex items-start overflow-hidden bg-background">
      {/* Soft background wash (prevents hard gradient edges at top/bottom) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.20)_32%,hsl(var(--secondary)/0.10)_72%,hsl(var(--background))_100%)]"
      />

      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 left-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
      </div>
      
      <div className="container mx-auto px-4 pt-4 pb-12 relative z-10">
        {/* Quick Action Buttons */}
        <div className="relative flex flex-wrap justify-center gap-4 md:gap-10 mb-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-10 h-28 bg-primary/20 blur-3xl"
          />
          {quickActions.map((action, index) => (
            <Button
              key={action.path}
              size="lg"
              onClick={() => navigate(action.path)}
              className={`${action.color} text-primary-foreground transition-all hover:scale-110 px-8 py-7 text-lg font-bold rounded-xl animate-fade-in shadow-warm hover:shadow-glow`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <action.icon className="w-6 h-6 mr-2" />
              {action.label}
            </Button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Content */}
          <div className="space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20">
              <Heart className="w-3.5 h-3.5 text-primary fill-primary" />
              <span className="text-xs font-semibold text-primary">{badge_text}</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-[1.1] text-foreground">
              {hasGradient ? (
                <>
                  {beforeGradient}
                  <span className="relative inline-block">
                    <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                      {gradient_text}
                    </span>
                    <svg className="absolute -bottom-1 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                      <path d="M2 6C50 2 150 2 198 6" stroke="currentColor" strokeWidth="2" className="text-secondary" />
                    </svg>
                  </span>
                  {afterGradient}
                </>
              ) : (
                heading
              )}
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
              {description}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                size="lg" 
                onClick={handleButtonClick}
                className="group px-6 py-6 shadow-warm hover:shadow-glow transition-all hover:scale-105 bg-gradient-warm border-0"
              >
                {button_text}
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => document.getElementById('mission')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-6 py-6 border-2 hover:bg-primary/5 hover:border-primary transition-all hover:scale-105"
              >
                Learn More
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-6 pt-4">
              <div className="space-y-0.5">
                <div className="text-3xl font-black text-primary">{stat1_number}</div>
                <div className="text-xs text-muted-foreground">{stat1_label}</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-3xl font-black text-secondary">{stat2_number}</div>
                <div className="text-xs text-muted-foreground">{stat2_label}</div>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative lg:h-[500px] animate-scale-in" style={{ animationDelay: '0.3s' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-secondary rounded-3xl rotate-3 opacity-20 blur-xl" />
            <div className="relative h-full rounded-3xl overflow-hidden shadow-xl">
              <OptimizedImage
                src={image_url}
                alt="Best Day Ministries community members creating together"
                className="w-full h-full"
                priority={true}
                objectFit="cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
              
              {/* Floating card */}
              <div className="absolute bottom-6 left-6 right-6 bg-card/95 backdrop-blur-md rounded-xl p-4 shadow-float border border-border animate-slide-up">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary via-accent to-secondary flex items-center justify-center flex-shrink-0">
                    <Heart className="w-5 h-5 text-white fill-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base mb-0.5">Creating Impact Daily</h3>
                    <p className="text-xs text-muted-foreground">
                      Every purchase supports adults with special needs in building independence
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
