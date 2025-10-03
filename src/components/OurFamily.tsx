import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import * as Icons from "lucide-react";

interface FamilyOrg {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  color: string;
  button_text: string;
}

const OurFamily = () => {
  const [orgs, setOrgs] = useState<FamilyOrg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrgs();
  }, []);

  const loadOrgs = async () => {
    try {
      const { data, error } = await supabase
        .from("family_organizations")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setOrgs(data || []);
    } catch (error) {
      console.error("Error loading organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || orgs.length === 0) return null;

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
            Best Day Ministries is part of a vibrant family of organizations, 
            each dedicated to building community and spreading joy.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {orgs.map((org) => {
            const IconComponent = Icons[org.icon as keyof typeof Icons] as any;
            return (
              <Card
                key={org.id}
                className="group p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50 bg-gradient-to-br from-card to-muted/30 flex flex-col"
              >
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${org.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                  {IconComponent && <IconComponent className="w-8 h-8 text-primary" />}
                </div>
                
                <h3 className="text-2xl font-bold mb-3 text-foreground">
                  {org.name}
                </h3>
                
                <p className="text-muted-foreground mb-6 leading-relaxed flex-grow">
                  {org.description}
                </p>
                
                <Button
                  variant="outline"
                  className="group/btn w-full min-h-[44px]"
                  onClick={() => {
                    if (org.url.startsWith('http')) {
                      window.open(org.url, '_blank', 'noopener,noreferrer');
                    } else {
                      const element = document.querySelector(org.url);
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  <span>{org.button_text}</span>
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
