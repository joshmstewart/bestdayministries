import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, Users, X } from "lucide-react";
import { GuideFeedback } from "./GuideFeedback";
import { VideoEmbed } from "./VideoEmbed";

interface Guide {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  visible_to_roles: string[];
  reading_time_minutes: number | null;
}

interface GuideViewerProps {
  guide: Guide;
  onClose: () => void;
}

export function GuideViewer({ guide, onClose }: GuideViewerProps) {
  // Track guide as read in localStorage
  useEffect(() => {
    const readGuides = JSON.parse(localStorage.getItem("read_guides") || "[]");
    if (!readGuides.includes(guide.id)) {
      readGuides.push(guide.id);
      localStorage.setItem("read_guides", JSON.stringify(readGuides));
    }
  }, [guide.id]);
  // Parse inline markdown formatting
  const parseInlineMarkdown = (text: string) => {
    const parts: (string | JSX.Element)[] = [];
    let currentIndex = 0;
    let key = 0;

    // Pattern to match **bold**, *italic*, `code`, and [links](url)
    const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/g;
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // Add text before match
      if (match.index > currentIndex) {
        parts.push(text.substring(currentIndex, match.index));
      }

      const matched = match[0];
      
      if (matched.startsWith('**') && matched.endsWith('**')) {
        // Bold text with better styling
        parts.push(
          <strong key={key++} className="font-bold text-primary">
            {matched.slice(2, -2)}
          </strong>
        );
      } else if (matched.startsWith('*') && matched.endsWith('*') && !matched.startsWith('**')) {
        // Italic text
        parts.push(
          <em key={key++} className="italic">
            {matched.slice(1, -1)}
          </em>
        );
      } else if (matched.startsWith('`') && matched.endsWith('`')) {
        // Inline code
        parts.push(
          <code key={key++} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
            {matched.slice(1, -1)}
          </code>
        );
      } else if (matched.startsWith('[')) {
        // Link
        const linkText = match[2];
        const linkUrl = match[3];
        parts.push(
          <a
            key={key++}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            {linkText}
          </a>
        );
      }

      currentIndex = match.index + matched.length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const renderContent = (content: string) => {
    return content.split("\n\n").map((paragraph, idx) => {
      // Headers
      if (paragraph.startsWith("# ")) {
        return (
          <h1 key={idx} className="text-3xl font-bold mb-4 mt-8">
            {parseInlineMarkdown(paragraph.replace("# ", ""))}
          </h1>
        );
      }
      if (paragraph.startsWith("## ")) {
        return (
          <h2 key={idx} className="text-2xl font-bold mb-3 mt-6">
            {parseInlineMarkdown(paragraph.replace("## ", ""))}
          </h2>
        );
      }
      if (paragraph.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-xl font-semibold mb-2 mt-4">
            {parseInlineMarkdown(paragraph.replace("### ", ""))}
          </h3>
        );
      }

      // Check for **Term** - Description pattern (common in feature lists)
      const featurePattern = /\*\*([^*]+)\*\*\s*-\s*([^*\n]+?)(?=\s*-\s*\*\*|$)/g;
      if (featurePattern.test(paragraph)) {
        const items: { term: string; description: string }[] = [];
        let match;
        const regex = /\*\*([^*]+)\*\*\s*-\s*([^*\n]+?)(?=\s*-\s*\*\*|$)/g;
        
        while ((match = regex.exec(paragraph)) !== null) {
          items.push({
            term: match[1],
            description: match[2].trim()
          });
        }

        if (items.length > 0) {
          return (
            <ul key={idx} className="space-y-4 mb-6">
              {items.map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-primary mt-0.5">•</span>
                  <div className="flex-1">
                    <span className="font-semibold text-primary">{item.term}</span>
                    <span className="text-foreground/80"> - {item.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          );
        }
      }

      // Lists
      if (paragraph.includes("\n- ")) {
        const items = paragraph.split("\n- ").filter(Boolean);
        return (
          <ul key={idx} className="space-y-3 mb-6">
            {items.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-primary mt-1.5">•</span>
                <span className="flex-1">{parseInlineMarkdown(item.replace(/^- /, ""))}</span>
              </li>
            ))}
          </ul>
        );
      }

      // Numbered lists
      if (/^\d+\. /.test(paragraph)) {
        const items = paragraph.split(/\n\d+\. /).filter(Boolean);
        return (
          <ol key={idx} className="space-y-3 mb-6">
            {items.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-semibold text-primary min-w-[1.5rem]">{i + 1}.</span>
                <span className="flex-1">{parseInlineMarkdown(item.replace(/^\d+\. /, ""))}</span>
              </li>
            ))}
          </ol>
        );
      }

      // Regular paragraphs
      return (
        <p key={idx} className="mb-6 leading-relaxed text-foreground/90">
          {parseInlineMarkdown(paragraph)}
        </p>
      );
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]" aria-describedby={undefined} hideCloseButton>
        <DialogHeader>
          <div className="flex items-start gap-3">
            {/* Content area - takes up remaining space */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="secondary">{guide.category.replace("-", " ")}</Badge>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {guide.reading_time_minutes && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {guide.reading_time_minutes} min read
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {guide.visible_to_roles.join(", ")}
                  </div>
                </div>
              </div>
              <DialogTitle className="text-2xl">{guide.title}</DialogTitle>
              <p className="text-muted-foreground">{guide.description}</p>
            </div>
            
            {/* Action buttons container - aligned to right */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="hover:bg-accent"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[55vh] pr-4">
          <div className="prose prose-sm max-w-none space-y-1">
            {renderContent(guide.content)}
          </div>
        </ScrollArea>

        <Separator className="my-4" />
        <div className="flex justify-center">
          <GuideFeedback guideId={guide.id} guideName={guide.title} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
