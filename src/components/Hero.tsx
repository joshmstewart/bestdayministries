import { Button } from "@/components/ui/button";
import { ArrowRight, Heart } from "lucide-react";
import heroImage from "@/assets/hero-hands.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-gradient-to-br from-background via-muted/30 to-secondary/10 pt-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Content */}
          <div className="space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20">
              <Heart className="w-3.5 h-3.5 text-primary fill-primary" />
              <span className="text-xs font-semibold text-primary">Building Community Through Creativity</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] text-foreground">
              Spreading{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                  JOY
                </span>
                <svg className="absolute -bottom-1 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                  <path d="M2 6C50 2 150 2 198 6" stroke="currentColor" strokeWidth="2" className="text-secondary" />
                </svg>
              </span>
              {" "}through the unique gifts of the special needs community
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
              Building a supportive community for adults with special needs by sharing their creativity and giving them confidence, independence, and JOY!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                size="lg" 
                onClick={() => window.location.href = "/auth"}
                className="group px-6 py-6 shadow-warm hover:shadow-glow transition-all hover:scale-105 bg-gradient-to-r from-primary via-accent to-secondary border-0"
              >
                Join Our Community
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
                <div className="text-3xl font-black text-primary">500+</div>
                <div className="text-xs text-muted-foreground">Community Members</div>
              </div>
              <div className="space-y-0.5">
                <div className="text-3xl font-black text-secondary">10K+</div>
                <div className="text-xs text-muted-foreground">Lives Touched</div>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative lg:h-[500px] animate-scale-in" style={{ animationDelay: '0.3s' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-secondary rounded-3xl rotate-3 opacity-20 blur-xl" />
            <div className="relative h-full rounded-3xl overflow-hidden shadow-xl">
              <img
                src={heroImage}
                alt="Joy House community members creating together"
                className="w-full h-full object-cover"
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
