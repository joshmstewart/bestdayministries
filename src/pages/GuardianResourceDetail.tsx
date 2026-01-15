import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, FileText, Download, Calendar } from "lucide-react";
import DOMPurify from "dompurify";
import { format } from "date-fns";

const resourceTypeColors: Record<string, string> = {
  form: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  guide: "bg-green-500/10 text-green-600 border-green-500/20",
  link: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  article: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

const resourceTypeLabels: Record<string, string> = {
  form: "Form/Application",
  guide: "Guide",
  link: "Resource",
  article: "Article",
};

interface Attachment {
  name: string;
  url: string;
  type?: string;
}

export default function GuardianResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: resource, isLoading, error } = useQuery({
    queryKey: ["guardian-resource-detail", id],
    queryFn: async () => {
      if (!id) throw new Error("No resource ID");
      
      const { data, error } = await supabase
        .from("guardian_resources")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <>
        <UnifiedHeader />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/4" />
              <div className="h-12 bg-muted rounded w-3/4" />
              <div className="h-64 bg-muted rounded" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !resource) {
    return (
      <>
        <UnifiedHeader />
        <main className="min-h-screen bg-background pt-24 pb-16">
          <div className="container max-w-4xl mx-auto px-4 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Resource Not Found</h1>
            <p className="text-muted-foreground mb-6">
              This resource may have been removed or is no longer available.
            </p>
            <Button onClick={() => navigate("/guardian-resources")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Resources
            </Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const rawAttachments = resource.attachments;
  const attachments: Attachment[] = Array.isArray(rawAttachments) 
    ? (rawAttachments as unknown as Attachment[])
    : [];

  return (
    <>
      <SEOHead
        title={`${resource.title} | Guardian Resources`}
        description={resource.description || "Guardian resource information"}
      />
      <UnifiedHeader />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/guardian-resources")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Resources
          </Button>

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="outline">{resource.category}</Badge>
              <Badge
                variant="outline"
                className={resourceTypeColors[resource.resource_type] || ""}
              >
                {resourceTypeLabels[resource.resource_type] || resource.resource_type}
              </Badge>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {resource.title}
            </h1>

            {resource.description && (
              <p className="text-lg text-muted-foreground mb-4">
                {resource.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Updated {format(new Date(resource.updated_at), "MMMM d, yyyy")}
              </span>
            </div>
          </div>

          {/* Cover Image */}
          {resource.cover_image_url && (
            <div className="mb-8 rounded-lg overflow-hidden">
              <img
                src={resource.cover_image_url}
                alt={resource.title}
                className="w-full h-auto max-h-[400px] object-cover"
              />
            </div>
          )}

          {/* Content */}
          {resource.content && resource.has_content_page && (
            <Card className="mb-8">
              <CardContent className="pt-6">
                <div
                  className="prose prose-sm md:prose-base max-w-none dark:prose-invert 
                    prose-headings:text-foreground prose-p:text-foreground 
                    prose-a:text-primary prose-strong:text-foreground
                    prose-ul:text-foreground prose-ol:text-foreground
                    prose-li:text-foreground"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(resource.content),
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* External Link */}
          {resource.url && (
            <Card className="mb-8">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium mb-1">External Resource</h3>
                    <p className="text-sm text-muted-foreground truncate max-w-md">
                      {resource.url}
                    </p>
                  </div>
                  <Button
                    onClick={() => window.open(resource.url, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Resource
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-4">Downloads & Attachments</h3>
                <div className="space-y-2">
                  {attachments.map((attachment, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => window.open(attachment.url, "_blank")}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {attachment.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
