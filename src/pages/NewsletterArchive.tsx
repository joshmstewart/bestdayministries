import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Users, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const NewsletterArchive = () => {
  const { data: newsletters, isLoading } = useQuery({
    queryKey: ["newsletter-archive"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_campaigns")
        .select("id, title, subject, preview_text, sent_at, sent_to_count")
        .eq("status", "sent")
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Newsletter Archive | Best Day Ministries"
        description="Browse past newsletters from Best Day Ministries. Read inspiring stories, community updates, and event highlights."
      />
      <UnifiedHeader />

      <main className="flex-1 pt-24 pb-12">
        {/* Hero / Subscribe CTA */}
        <section className="bg-gradient-to-br from-primary/10 to-secondary/10 py-12 mb-8">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Newsletter Archive</h1>
            <p className="text-muted-foreground text-lg mb-6">
              Catch up on all our past newsletters — inspiring stories, community updates, and more.
            </p>
            <div className="max-w-md mx-auto">
              <NewsletterSignup compact />
            </div>
          </div>
        </section>

        {/* Newsletter List */}
        <div className="container mx-auto px-4 max-w-4xl">
          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded w-2/3 mb-3" />
                    <div className="h-4 bg-muted rounded w-full mb-2" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : newsletters?.length === 0 ? (
            <div className="text-center py-16">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No newsletters yet</h2>
              <p className="text-muted-foreground">
                Subscribe above to be the first to know when we publish!
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {newsletters?.map((newsletter) => (
                <Link key={newsletter.id} to={`/newsletters/${newsletter.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                    <CardContent className="p-6">
                      <h2 className="text-xl font-semibold group-hover:text-primary transition-colors mb-2">
                        {newsletter.title || newsletter.subject}
                      </h2>
                      {newsletter.preview_text && (
                        <p className="text-muted-foreground line-clamp-2 mb-3">
                          {newsletter.preview_text}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {newsletter.sent_at && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(newsletter.sent_at), "MMMM d, yyyy")}
                          </span>
                        )}
                        {newsletter.sent_to_count && (
                          <span className="flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            {newsletter.sent_to_count.toLocaleString()} recipients
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Bottom Subscribe CTA */}
          {newsletters && newsletters.length > 0 && (
            <div className="mt-12">
              <NewsletterSignup compact />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NewsletterArchive;
