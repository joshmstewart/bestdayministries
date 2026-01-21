import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEOHead } from "@/components/SEOHead";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { 
  Search, ExternalLink, FileText, Shield, DollarSign, Heart, 
  Home, Briefcase, Users, GraduationCap, Laptop, PiggyBank,
  Ticket, HeartHandshake, BookOpen, ArrowLeft, ChevronRight
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Shield,
  DollarSign,
  Heart,
  Home,
  Briefcase,
  Users,
  GraduationCap,
  Laptop,
  PiggyBank,
  Ticket,
  HeartHandshake,
  BookOpen,
};

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

export default function GuardianResources() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const navigate = useNavigate();

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["guardian-resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guardian_resources")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const categories = useMemo(() => {
    const cats = new Set(resources.map((r) => r.category));
    return ["all", ...Array.from(cats).sort()];
  }, [resources]);

  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      const matchesSearch =
        searchQuery === "" ||
        resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        activeCategory === "all" || resource.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [resources, searchQuery, activeCategory]);

  const groupedResources = useMemo(() => {
    const grouped: Record<string, typeof filteredResources> = {};
    filteredResources.forEach((resource) => {
      if (!grouped[resource.category]) {
        grouped[resource.category] = [];
      }
      grouped[resource.category].push(resource);
    });
    return grouped;
  }, [filteredResources]);

  const handleResourceClick = (resource: any) => {
    if (resource.has_content_page) {
      navigate(`/guardian-resources/${resource.id}`);
    } else if (resource.url) {
      window.open(resource.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <SEOHead
        title="Guardian Resources | Best Day Ministries"
        description="Practical resources for guardians including grants, government forms, financial planning, and support services for individuals with disabilities."
      />
      <UnifiedHeader />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container max-w-6xl mx-auto px-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Guardian Resources
            </h1>
            <p className="text-muted-foreground text-lg">
              Practical resources to help you navigate benefits, support services, and financial planning.
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Tabs */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="capitalize whitespace-nowrap"
                >
                  {category === "all" ? "All Resources" : category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-2/3 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredResources.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No resources found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter to find what you're looking for.
                </p>
              </CardContent>
            </Card>
          ) : activeCategory === "all" ? (
            // Grouped view when showing all
            <div className="space-y-8">
              {Object.entries(groupedResources).map(([category, categoryResources]) => (
                <div key={category}>
                  <h2 className="text-xl font-semibold mb-4 text-foreground">{category}</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {categoryResources.map((resource) => (
                      <ResourceCard 
                        key={resource.id} 
                        resource={resource} 
                        onClick={() => handleResourceClick(resource)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Flat view when filtered by category
            <div className="grid gap-4 md:grid-cols-2">
              {filteredResources.map((resource) => (
                <ResourceCard 
                  key={resource.id} 
                  resource={resource}
                  onClick={() => handleResourceClick(resource)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function ResourceCard({ resource, onClick }: { resource: any; onClick: () => void }) {
  const IconComponent = iconMap[resource.icon] || FileText;
  const hasContentPage = resource.has_content_page;
  const hasExternalUrl = !!resource.url;

  return (
    <Card 
      className="group hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {resource.cover_image_url && hasContentPage && (
        <div className="h-32 overflow-hidden rounded-t-lg">
          <img
            src={resource.cover_image_url}
            alt={resource.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <IconComponent className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2">{resource.title}</CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge
                variant="outline"
                className={resourceTypeColors[resource.resource_type] || ""}
              >
                {resourceTypeLabels[resource.resource_type] || resource.resource_type}
              </Badge>
              {hasContentPage && (
                <Badge variant="secondary" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Full Page
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="line-clamp-2 mb-4">
          {resource.description}
        </CardDescription>
        <Button
          variant="outline"
          size="sm"
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {hasContentPage ? (
            <>
              Read More
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          ) : hasExternalUrl ? (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Resource
            </>
          ) : (
            "View Details"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
