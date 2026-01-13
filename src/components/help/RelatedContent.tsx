import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, HelpCircle, PlayCircle, ChevronRight } from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  category: string;
  type: "tour" | "guide" | "faq";
}

interface RelatedContentProps {
  currentId: string;
  currentCategory: string;
  currentType: "tour" | "guide" | "faq";
  allTours?: ContentItem[];
  allGuides?: ContentItem[];
  allFaqs?: ContentItem[];
  onSelectTour?: (id: string) => void;
  onSelectGuide?: (id: string) => void;
  onSelectFaq?: (id: string) => void;
  maxItems?: number;
}

export function RelatedContent({
  currentId,
  currentCategory,
  currentType,
  allTours = [],
  allGuides = [],
  allFaqs = [],
  onSelectTour,
  onSelectGuide,
  onSelectFaq,
  maxItems = 3,
}: RelatedContentProps) {
  const relatedItems = useMemo(() => {
    const items: (ContentItem & { relevance: number })[] = [];

    // Add tours (if not currently viewing a tour)
    if (currentType !== "tour") {
      allTours.forEach(tour => {
        if (tour.id === currentId) return;
        const relevance = tour.category === currentCategory ? 2 : 1;
        items.push({ ...tour, type: "tour", relevance });
      });
    }

    // Add guides (if not currently viewing a guide)
    if (currentType !== "guide") {
      allGuides.forEach(guide => {
        if (guide.id === currentId) return;
        const relevance = guide.category === currentCategory ? 2 : 1;
        items.push({ ...guide, type: "guide", relevance });
      });
    }

    // Add FAQs (if not currently viewing FAQ)
    if (currentType !== "faq") {
      allFaqs.forEach(faq => {
        if (faq.id === currentId) return;
        const relevance = faq.category === currentCategory ? 2 : 1;
        items.push({ ...faq, type: "faq", relevance });
      });
    }

    // Sort by relevance (same category first) then limit
    return items
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxItems);
  }, [currentId, currentCategory, currentType, allTours, allGuides, allFaqs, maxItems]);

  if (relatedItems.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case "tour": return PlayCircle;
      case "guide": return BookOpen;
      case "faq": return HelpCircle;
      default: return BookOpen;
    }
  };

  const handleSelect = (item: ContentItem) => {
    switch (item.type) {
      case "tour":
        onSelectTour?.(item.id);
        break;
      case "guide":
        onSelectGuide?.(item.id);
        break;
      case "faq":
        onSelectFaq?.(item.id);
        break;
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Related Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {relatedItems.map((item) => {
          const Icon = getIcon(item.type);
          
          return (
            <Button
              key={`${item.type}-${item.id}`}
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => handleSelect(item)}
            >
              <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {item.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground capitalize">
                    {item.category.replace("-", " ")}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
