import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { ShareButtons } from "@/components/ShareButtons";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

const NewsletterView = () => {
  const { id } = useParams<{ id: string }>();

  const { data: newsletter, isLoading, error } = useQuery({
    queryKey: ["newsletter-view", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_campaigns")
        .select("id, title, display_name, subject, preview_text, html_content, sent_at, sent_to_count")
        .eq("id", id!)
        .eq("status", "sent")
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const displayTitle = newsletter?.display_name || newsletter?.title || newsletter?.subject || "Newsletter";
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const pageUrl = `${window.location.origin}/newsletters/${id}`;
  const socialShareUrl = newsletter
    ? `${supabaseUrl}/functions/v1/generate-meta-tags?newsletterId=${id}&redirect=${encodeURIComponent(pageUrl)}`
    : pageUrl;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <UnifiedHeader />
        <main className="flex-1 pt-24 pb-12 container mx-auto px-4">
          <div className="max-w-[600px] mx-auto animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !newsletter) {
    return (
      <div className="min-h-screen flex flex-col">
        <UnifiedHeader />
        <main className="flex-1 pt-24 pb-12 container mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold mb-4">Newsletter not found</h1>
          <p className="text-muted-foreground mb-6">This newsletter may have been removed or doesn't exist.</p>
          <Button variant="outline" asChild>
            <Link to="/newsletters">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to all newsletters
            </Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const sanitizedHtml = DOMPurify.sanitize(newsletter.html_content, {
    ADD_TAGS: ["style"],
    ADD_ATTR: ["target", "style"],
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={`${displayTitle} | Best Day Ministries`}
        description={newsletter.preview_text || `Read "${displayTitle}" from Best Day Ministries`}
      />
      <UnifiedHeader />

      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-[600px] mx-auto mb-6">
            <Button variant="outline" size="sm" className="mb-6" asChild>
              <Link to="/newsletters">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to all newsletters
              </Link>
            </Button>

            <h1 className="text-2xl md:text-3xl font-bold mb-3">{displayTitle}</h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
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

            <ShareButtons
              title={displayTitle}
              description={newsletter.preview_text || ""}
              url={socialShareUrl}
            />
          </div>

          {/* Newsletter Content */}
          <div className="max-w-[600px] mx-auto border rounded-lg overflow-hidden bg-card shadow-sm">
            <div
              className="newsletter-content"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          </div>

          {/* Bottom actions */}
          <div className="max-w-[600px] mx-auto mt-8 space-y-6">
            <ShareButtons
              title={displayTitle}
              description={newsletter.preview_text || ""}
              url={socialShareUrl}
            />
            <NewsletterSignup compact />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NewsletterView;
