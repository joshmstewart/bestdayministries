import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  BookOpen, 
  PlayCircle, 
  HelpCircle, 
  Search,
  Clock,
  Users,
  ChevronRight,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { GuideViewer } from "@/components/help/GuideViewer";
import { FAQSection } from "@/components/help/FAQSection";
import { useToast } from "@/hooks/use-toast";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { useTourCompletions } from "@/hooks/useTourCompletions";
import { TextToSpeech } from "@/components/TextToSpeech";

interface Tour {
  id: string;
  title: string;
  description: string;
  category: string;
  visible_to_roles: string[];
  duration_minutes: number | null;
  icon: string;
  steps: any[];
  required_route?: string;
}

interface Guide {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  visible_to_roles: string[];
  reading_time_minutes: number | null;
  icon: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export default function HelpCenter() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [tours, setTours] = useState<Tour[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [faqs, setFAQs] = useState<FAQ[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { isTourCompleted, loading: completionsLoading } = useTourCompletions();

  const activeTab = searchParams.get("tab") || "tours";

  useEffect(() => {
    loadHelpContent();
  }, []);

  const loadHelpContent = async () => {
    try {
      setIsLoading(true);

      const [toursRes, guidesRes, faqsRes] = await Promise.all([
        supabase
          .from("help_tours")
          .select("*")
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("help_guides")
          .select("*")
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("help_faqs")
          .select("*")
          .eq("is_active", true)
          .order("display_order"),
      ]);

      if (toursRes.data) {
        setTours(toursRes.data.map(tour => ({
          ...tour,
          steps: Array.isArray(tour.steps) ? tour.steps : []
        })) as Tour[]);
      }
      if (guidesRes.data) setGuides(guidesRes.data as Guide[]);
      if (faqsRes.data) setFAQs(faqsRes.data as FAQ[]);
    } catch (error) {
      console.error("Error loading help content:", error);
      toast({
        title: "Error",
        description: "Failed to load help content",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTours = tours.filter(
    (tour) =>
      tour.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tour.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGuides = guides.filter(
    (guide) =>
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      general: "bg-blue-100 text-blue-800",
      feature: "bg-purple-100 text-purple-800",
      "role-specific": "bg-green-100 text-green-800",
      "getting-started": "bg-orange-100 text-orange-800",
      advanced: "bg-red-100 text-red-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const handleStartTour = (tour: Tour) => {
    // Navigate to the required route with tour ID in params
    if (tour.required_route) {
      navigate(`${tour.required_route}?tour=${tour.id}`);
    } else {
      navigate(`/help?tour=${tour.id}`);
    }
  };

  const handleViewGuide = (guide: Guide) => {
    setSelectedGuide(guide);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 pt-24">
        <div className="container mx-auto px-4 pb-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Help Center</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Learn how to make the most of our platform
            </p>

            {/* Search */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search tours, guides, and FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
            <TabsList className="inline-flex flex-wrap h-auto mx-auto mb-8">
              <TabsTrigger value="tours" className="gap-2 whitespace-nowrap">
                <PlayCircle className="h-4 w-4" />
                Tours
              </TabsTrigger>
              <TabsTrigger value="guides" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Guides
              </TabsTrigger>
              <TabsTrigger value="faqs" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                FAQs
              </TabsTrigger>
            </TabsList>

            {/* Product Tours */}
            <TabsContent value="tours">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredTours.map((tour) => {
                  const isCompleted = isTourCompleted(tour.id);
                  const isNew = !isCompleted; // Consider all uncompleted tours as "new"
                  
                  return (
                    <Card key={tour.id} className="hover:shadow-lg transition-shadow relative">
                      <CardHeader>
                        <div className="flex items-start gap-2 mb-2">
                          {isCompleted && (
                            <Badge className="bg-green-100 text-green-800 gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Complete
                            </Badge>
                          )}
                          {isNew && !isCompleted && (
                            <Badge className="bg-gradient-warm text-white gap-1 animate-pulse">
                              <Sparkles className="h-3 w-3" />
                              New
                            </Badge>
                          )}
                          <Badge className={getCategoryBadgeColor(tour.category)}>
                            {tour.category.replace("-", " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-xl flex-1">{tour.title}</CardTitle>
                          <TextToSpeech 
                            text={`${tour.title}. ${tour.description}`}
                            size="sm"
                          />
                        </div>
                        <CardDescription>{tour.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          {tour.duration_minutes && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {tour.duration_minutes} min
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {tour.visible_to_roles?.filter(role => role !== 'admin' && role !== 'owner').join(", ") || "all"}
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleStartTour(tour)} 
                          className="w-full"
                          variant={isCompleted ? "outline" : "default"}
                        >
                          {isCompleted ? "Review Tour" : "Start Tour"}
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {filteredTours.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <PlayCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No tours found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Check back soon for interactive tours"}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Guides */}
            <TabsContent value="guides">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredGuides.map((guide) => (
                  <Card key={guide.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <BookOpen className="h-8 w-8 text-secondary" />
                        <Badge className={getCategoryBadgeColor(guide.category)}>
                          {guide.category.replace("-", " ")}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">{guide.title}</CardTitle>
                      <CardDescription>{guide.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        {guide.reading_time_minutes && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {guide.reading_time_minutes} min read
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {guide.visible_to_roles?.filter(role => role !== 'admin' && role !== 'owner').join(", ") || "all"}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleViewGuide(guide)}
                        variant="outline"
                        className="w-full"
                      >
                        Read Guide
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredGuides.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No guides found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Check back soon for helpful guides"}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* FAQs */}
            <TabsContent value="faqs">
              <div className="max-w-4xl mx-auto">
                <FAQSection faqs={filteredFAQs} />

                {filteredFAQs.length === 0 && !isLoading && (
                  <div className="text-center py-12">
                    <HelpCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">No FAQs found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? "Try adjusting your search"
                        : "Check back soon for frequently asked questions"}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />

      {/* Guide Viewer */}
      {selectedGuide && (
        <GuideViewer
          guide={selectedGuide}
          onClose={() => setSelectedGuide(null)}
        />
      )}
    </div>
  );
}
