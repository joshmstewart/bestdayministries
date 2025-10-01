import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, Film } from "lucide-react";
import bdeLogo from "@/assets/bde-logo.png";

const About = () => {
  return (
    <section id="about" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto space-y-16">
          {/* Our Story */}
          <div className="text-center space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              Our Story
            </h2>
            <div className="max-w-3xl mx-auto space-y-4 text-lg text-muted-foreground">
              <p>
                Joy House was born from the heart and creativity of <strong className="text-foreground">Seth Truitt</strong>, a 33-year-old with Down Syndrome who lives in his own home (the Joy House) on the back acre of his parent's property.
              </p>
              <p>
                Seth creates beautiful artwork to share with the world, and this inspired his family to create Joy House—a community where adults with special needs can showcase their unique talents and creativity while building confidence, independence, and JOY!
              </p>
            </div>
          </div>

          {/* Documentary */}
          <Card className="border-2 overflow-hidden">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-2">
                <div className="bg-primary/5 p-8 md:p-12 flex flex-col justify-center space-y-6">
                  <div className="flex items-center gap-3">
                    <Film className="w-10 h-10 text-primary" />
                    <h3 className="text-3xl font-bold text-foreground">
                      Joy Redefined
                    </h3>
                  </div>
                  <p className="text-lg text-muted-foreground">
                    Watch our documentary to learn the inspiring story of how Joy House came to be and the lives we're touching every day.
                  </p>
                  <Button size="lg" className="w-fit shadow-warm">
                    Watch Documentary
                  </Button>
                </div>
                <div className="bg-gradient-to-br from-primary/20 to-secondary/20 min-h-[300px] flex items-center justify-center">
                  <div className="text-center space-y-4 p-8">
                    <Film className="w-24 h-24 mx-auto text-primary/40" />
                    <p className="text-muted-foreground">Available on YouTube, Vimeo, and DailyMotion</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Best Day Ever */}
          <Card className="border-2 overflow-hidden" style={{ backgroundColor: 'hsl(27 41% 88%)' }}>
            <CardContent className="p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <img 
                    src={bdeLogo} 
                    alt="Best Day Ever Coffee + Crepes" 
                    className="w-64 h-auto"
                  />
                  <p className="text-lg" style={{ color: 'hsl(13 33% 36%)' }}>
                    The founders of Joy House have opened a partner company, <strong>best day ever! coffee + crepes</strong> in Longmont, Colorado.
                  </p>
                  <p className="text-lg" style={{ color: 'hsl(13 33% 36%)' }}>
                    Come in for delicious crepes, coffee, and ice cream while supporting our mission!
                  </p>
                  <div className="space-y-2">
                    <div className="font-semibold" style={{ color: 'hsl(13 33% 36%)' }}>📍 516 Coffman Street, Longmont, CO</div>
                    <div className="font-bold text-xl" style={{ color: 'hsl(13 33% 36%)' }}>Open NOW!</div>
                  </div>
                  <Button 
                    size="lg" 
                    className="shadow-soft"
                    style={{ 
                      backgroundColor: 'hsl(13 33% 36%)',
                      color: 'hsl(27 41% 88%)'
                    }}
                  >
                    Visit Best Day Ever
                  </Button>
                </div>
                <div className="flex items-center justify-center min-h-[300px]">
                  <div className="text-center space-y-4">
                    <Coffee className="w-24 h-24 mx-auto" style={{ color: 'hsl(13 33% 36%)' }} />
                    <p className="text-2xl font-semibold" style={{ color: 'hsl(13 33% 36%)' }}>
                      Experience joy in every sip and bite!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default About;
