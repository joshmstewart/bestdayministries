import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  role_title: string | null;
  description: string | null;
  image_url: string | null;
  display_order: number;
}

export default function MeetTheTeam() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from("team_members")
        .select("id, name, role_title, description, image_url, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      setMembers(data || []);
      setLoading(false);
    };
    fetchMembers();
  }, []);

  return (
    <>
      <SEOHead
        title="Meet The Team | Best Day Ministries"
        description="Get to know the passionate team behind Best Day Ministries."
      />
      <UnifiedHeader />
      <main className="pt-24 pb-16 min-h-screen bg-background">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-3">Meet The Team</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The passionate people who make Best Day Ministries possible.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="w-32 h-32 rounded-full mx-auto" />
                    <Skeleton className="h-6 w-3/4 mx-auto" />
                    <Skeleton className="h-4 w-1/2 mx-auto" />
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-center text-muted-foreground">No team members to display yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {members.map((member) => (
                <Card key={member.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center space-y-4">
                    {member.image_url ? (
                      <img
                        src={member.image_url}
                        alt={member.name}
                        className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-primary/20"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full mx-auto bg-primary/10 flex items-center justify-center border-4 border-primary/20">
                        <Users className="w-12 h-12 text-primary/40" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">{member.name}</h2>
                      {member.role_title && (
                        <p className="text-sm font-medium text-primary mt-1">{member.role_title}</p>
                      )}
                    </div>
                    {member.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{member.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
