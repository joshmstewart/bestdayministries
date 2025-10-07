import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

interface Partner {
  id: string;
  name: string;
  description: string | null;
  logo_url: string;
  website_url: string;
  display_order: number;
}

export default function Partners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPartners(data || []);
    } catch (error: any) {
      console.error("Failed to load partners:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      
      <main className="flex-1 pt-24">
        <div className="container mx-auto px-4 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Partners</h1>
              <p className="text-lg text-muted-foreground">
                We're grateful to partner with these amazing organizations who share our mission
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading partners...</p>
              </div>
            ) : partners.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No partners to display yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {partners.map((partner) => (
                  <Card key={partner.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-full h-32 flex items-center justify-center">
                          <img
                            src={partner.logo_url}
                            alt={partner.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        
                        <h3 className="text-xl font-semibold">{partner.name}</h3>
                        
                        {partner.description && (
                          <p className="text-muted-foreground">
                            {partner.description}
                          </p>
                        )}
                        
                        <a
                          href={partner.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                        >
                          Visit Website
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
