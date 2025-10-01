import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Heart, TrendingUp } from "lucide-react";

const Donate = () => {
  const raised = 7140;
  const goal = 50000;
  const percentage = (raised / goal) * 100;

  return (
    <section id="donate" className="py-24 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              Make a Difference Today
            </h2>
            <p className="text-xl text-muted-foreground">
              Your support helps us empower adults with disabilities through creativity and community
            </p>
          </div>

          <Card className="border-2 shadow-xl">
            <CardContent className="p-8 md:p-12 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold text-primary">
                      ${raised.toLocaleString()}
                    </div>
                    <div className="text-muted-foreground">
                      raised of ${goal.toLocaleString()} goal
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-accent">
                    <TrendingUp className="w-8 h-8" />
                    <span className="text-2xl font-bold">{percentage.toFixed(0)}%</span>
                  </div>
                </div>
                
                <Progress value={percentage} className="h-4" />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-primary text-primary-foreground border-0">
                  <CardContent className="p-6 space-y-4">
                    <Heart className="w-12 h-12" />
                    <h3 className="text-2xl font-bold">One-Time Donation</h3>
                    <p className="opacity-95">
                      Make a one-time contribution to support our mission
                    </p>
                    <Button 
                      variant="secondary" 
                      size="lg" 
                      className="w-full"
                    >
                      Donate Now
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-accent text-accent-foreground border-0">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Heart className="w-12 h-12" />
                      <div className="text-2xl font-bold">$20/mo</div>
                    </div>
                    <h3 className="text-2xl font-bold">Joy House Club</h3>
                    <p className="opacity-95">
                      Join the club! Monthly donations help us grow our mission
                    </p>
                    <Button 
                      variant="secondary" 
                      size="lg" 
                      className="w-full"
                    >
                      Join the Club
                    </Button>
                    <div className="text-sm opacity-90">
                      ✨ Get 10% off all online purchases!
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-muted/50 rounded-xl p-6 space-y-3">
                <h4 className="font-semibold text-foreground text-lg">Your donation supports:</h4>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Bestie mentoring and job training programs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Career development and entrepreneurial opportunities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Community events and crafting nights</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">✓</span>
                    <span>Expanding Joy House locations nationwide</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Donate;
