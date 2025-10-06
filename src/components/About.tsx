import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, Film, MapPin, Clock } from "lucide-react";
import bdeLogo from "@/assets/bde-logo-transparent.png";
import teamWithFounder from "@/assets/team-with-founder.jpg";
import bdeOutdoorEvent from "@/assets/bde-outdoor-event.jpg";

interface AboutContent {
  badge_text?: string;
  heading?: string;
  story_paragraph1?: string;
  story_paragraph2?: string;
  doc_title?: string;
  doc_description?: string;
  doc_button_text?: string;
  doc_image_url?: string;
  bde_description1?: string;
  bde_description2?: string;
  bde_address?: string;
  bde_city?: string;
  bde_status?: string;
  bde_button_text?: string;
  bde_image_url?: string;
}

interface AboutProps {
  content?: AboutContent;
}

const About = ({ content = {} }: AboutProps) => {
  const {
    badge_text = "Founded with Love",
    heading = "Our Story",
    story_paragraph1 = "Best Day Ministries was born from the heart and creativity of Seth Truitt, a 33-year-old with Down Syndrome who lives in his own home (the Best Day Ministries house) on the back acre of his parent's property.",
    story_paragraph2 = "Seth creates beautiful artwork to share with the world, and this inspired his family to create Best Day Ministries—a community where adults with special needs can showcase their unique talents and creativity while building confidence, independence, and JOY!",
    doc_title = "Joy Redefined",
    doc_description = "Watch our documentary to learn the inspiring story of how Best Day Ministries came to be and the lives we're touching every day.",
    doc_button_text = "Watch Documentary",
    doc_image_url = teamWithFounder,
    bde_description1 = "The founders of Best Day Ministries have opened a partner company, best day ever! coffee + crepes in Longmont, Colorado.",
    bde_description2 = "Come in for delicious crepes, coffee, and ice cream while supporting our mission!",
    bde_address = "516 Coffman Street",
    bde_city = "Longmont, CO",
    bde_status = "Open NOW!",
    bde_button_text = "Visit Best Day Ever",
    bde_image_url = bdeOutdoorEvent,
  } = content || {};
  return (
    <section id="about" className="py-24 bg-gradient-to-b from-background via-muted/20 to-background relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto space-y-20">
          {/* Our Story */}
          <div className="text-center space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 mb-4">
              <span className="text-sm font-semibold text-primary">{badge_text}</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-foreground">
              {heading.split(' ').map((word, i) => 
                word.toLowerCase() === 'story' ? (
                  <span key={i} className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">{word}</span>
                ) : (
                  word + ' '
                )
              )}
            </h2>
            <div className="max-w-3xl mx-auto space-y-4 text-lg text-muted-foreground">
              <p>{story_paragraph1}</p>
              <p>{story_paragraph2}</p>
            </div>
          </div>

          {/* Documentary */}
          <Card className="border-2 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 group">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-2">
                <div className="bg-gradient-card p-8 md:p-12 flex flex-col justify-center space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Film className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-3xl font-black text-foreground">
                      {doc_title}
                    </h3>
                  </div>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {doc_description}
                  </p>
                  <Button size="lg" className="w-fit shadow-warm hover:shadow-glow transition-all hover:scale-105 bg-gradient-warm border-0">
                    <Film className="mr-2 w-5 h-5" />
                    {doc_button_text}
                  </Button>
                </div>
                <div className="relative overflow-hidden min-h-[300px]">
                  <img 
                    src={doc_image_url}
                    alt="Best Day Ministries team with founder and community members"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Best Day Ever */}
          <Card className="border-2 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 group" style={{ backgroundColor: 'hsl(27 41% 88%)' }}>
            <CardContent className="p-0">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="p-8 md:p-12 space-y-6 order-2 md:order-1">
                  <img 
                    src={bdeLogo} 
                    alt="Best Day Ever Coffee + Crepes" 
                    className="w-64 h-auto mb-6"
                  />
                  <p className="text-lg leading-relaxed" style={{ color: 'hsl(13 33% 36%)' }}>
                    {bde_description1}
                  </p>
                  <p className="text-lg leading-relaxed" style={{ color: 'hsl(13 33% 36%)' }}>
                    {bde_description2}
                  </p>
                  
                  <div className="space-y-4 pt-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 mt-1 flex-shrink-0" style={{ color: 'hsl(13 33% 36%)' }} />
                      <div>
                        <div className="font-bold text-lg" style={{ color: 'hsl(13 33% 36%)' }}>{bde_address}</div>
                        <div style={{ color: 'hsl(13 33% 36%)' }}>{bde_city}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 flex-shrink-0" style={{ color: 'hsl(13 33% 36%)' }} />
                      <div className="font-bold text-xl" style={{ color: 'hsl(13 33% 36%)' }}>{bde_status}</div>
                    </div>
                  </div>
                  
                  <Button 
                    size="lg" 
                    className="shadow-md hover:shadow-lg transition-all hover:scale-105"
                    style={{ 
                      backgroundColor: 'hsl(13 33% 36%)',
                      color: 'hsl(27 41% 88%)'
                    }}
                  >
                    <Coffee className="mr-2 w-5 h-5" />
                    {bde_button_text}
                  </Button>
                </div>
                
                <div className="relative overflow-hidden min-h-[400px] order-1 md:order-2">
                  <img 
                    src={bde_image_url}
                    alt="Best Day Ever outdoor event with Best Day Ministries partnership"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[hsl(13,33%,36%)]/30 to-transparent" />
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
