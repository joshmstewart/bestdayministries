import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Heart, TrendingUp, Sparkles, Gift } from "lucide-react";

const Donate = () => {
  const raised = 7140;
  const goal = 50000;
  const percentage = (raised / goal) * 100;

  return (
    <section id="donate" className="py-24 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-40 left-20 w-96 h-96 bg-secondary/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 space-y-4 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-4">
              <Gift className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Support Our Mission</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-foreground">
              Make a{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Difference
              </span>{" "}
              Today
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your support helps us empower adults with disabilities through creativity and community
            </p>
          </div>

          <Card className="border-2 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 mb-8">
            <CardContent className="p-8 md:p-12 bg-gradient-card">
              {/* Progress Section */}
              <div className="space-y-6 mb-8">
                <div className="flex items-end justify-between flex-wrap gap-4">
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <div className="text-5xl md:text-6xl font-black bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                        ${raised.toLocaleString()}
                      </div>
                      <TrendingUp className="w-8 h-8 text-primary animate-float" />
                    </div>
                    <div className="text-muted-foreground text-lg">
                      raised of <span className="font-bold text-foreground">${goal.toLocaleString()}</span> goal
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-accent/10 rounded-2xl px-6 py-4 border-2 border-accent/30">
                    <Sparkles className="w-6 h-6 text-accent" />
                    <div className="text-3xl font-black text-accent">{percentage.toFixed(0)}%</div>
                  </div>
                </div>
                
                <div className="relative">
                  <Progress value={percentage} className="h-6 bg-muted" />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-secondary opacity-80 rounded-full" style={{ width: `${percentage}%` }} />
                </div>
              </div>

              {/* Donation Options */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="border-2 bg-card hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 shadow-float hover:shadow-warm group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardContent className="p-8 space-y-4 relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Heart className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-black">One-Time Gift</h3>
                    <p className="text-muted-foreground">
                      Make a one-time contribution to support our mission and help us reach our goals
                    </p>
                    <Button 
                      size="lg" 
                      className="w-full shadow-warm hover:shadow-glow transition-all hover:scale-105 bg-gradient-warm border-0"
                    >
                      Donate Now
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 bg-card hover:border-secondary/50 transition-all duration-500 hover:-translate-y-2 shadow-float hover:shadow-warm group overflow-hidden relative">
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-primary via-accent to-secondary text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                    ⭐ POPULAR
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-accent/5 opacity-100 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardContent className="p-8 space-y-4 relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary/20 to-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Heart className="w-8 h-8 text-secondary fill-secondary" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-black">Best Day Ministries Club</h3>
                      <div className="text-2xl font-black text-secondary">$20/mo</div>
                    </div>
                    <p className="text-muted-foreground">
                      Join the club! Monthly donations help us grow our mission consistently
                    </p>
                    <Button 
                      size="lg" 
                      className="w-full shadow-warm hover:shadow-glow transition-all hover:scale-105 bg-gradient-warm border-0"
                    >
                      Join the Club
                    </Button>
                    <div className="flex items-center gap-2 text-sm font-semibold text-accent bg-accent/10 rounded-lg px-3 py-2">
                      <Sparkles className="w-4 h-4" />
                      Get 10% off all online purchases!
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 bg-card hover:border-accent/50 transition-all duration-500 hover:-translate-y-2 shadow-float hover:shadow-warm group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardContent className="p-8 space-y-4 relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Heart className="w-8 h-8 text-accent fill-accent" />
                    </div>
                    <h3 className="text-2xl font-black">Sponsor a Bestie</h3>
                    <p className="text-muted-foreground">
                      Directly support a community member's journey with a personalized sponsorship
                    </p>
                    <Button 
                      size="lg" 
                      className="w-full shadow-warm hover:shadow-glow transition-all hover:scale-105 bg-gradient-warm border-0"
                      onClick={() => window.location.href = '/sponsor-bestie'}
                    >
                      Sponsor Now
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Impact Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 shadow-float bg-gradient-card">
              <CardContent className="p-6">
                <h4 className="font-black text-lg mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Your donation supports:
                </h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary text-sm">✓</span>
                    </span>
                    <span className="text-muted-foreground">Bestie mentoring and job training programs</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary text-sm">✓</span>
                    </span>
                    <span className="text-muted-foreground">Career development and entrepreneurial opportunities</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary text-sm">✓</span>
                    </span>
                    <span className="text-muted-foreground">Community events and crafting nights</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary text-sm">✓</span>
                    </span>
                    <span className="text-muted-foreground">Expanding Best Day Ministries locations nationwide</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-float bg-gradient-to-br from-secondary/5 to-primary/5">
              <CardContent className="p-6 space-y-4">
                <h4 className="font-black text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                  Recent Impact
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Members served this year</span>
                    <span className="text-2xl font-black text-primary">247</span>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Community events hosted</span>
                    <span className="text-2xl font-black text-secondary">32</span>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Hours of mentoring</span>
                    <span className="text-2xl font-black text-accent">1,850</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Donate;
