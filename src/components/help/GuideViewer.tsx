import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Users } from "lucide-react";

interface Guide {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  target_audience: string;
  reading_time_minutes: number | null;
}

interface GuideViewerProps {
  guide: Guide;
  onClose: () => void;
}

export function GuideViewer({ guide, onClose }: GuideViewerProps) {
  // Simple markdown-like rendering (you could use a proper markdown library)
  const renderContent = (content: string) => {
    return content.split("\n\n").map((paragraph, idx) => {
      // Headers
      if (paragraph.startsWith("# ")) {
        return (
          <h1 key={idx} className="text-3xl font-bold mb-4 mt-8">
            {paragraph.replace("# ", "")}
          </h1>
        );
      }
      if (paragraph.startsWith("## ")) {
        return (
          <h2 key={idx} className="text-2xl font-bold mb-3 mt-6">
            {paragraph.replace("## ", "")}
          </h2>
        );
      }
      if (paragraph.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-xl font-semibold mb-2 mt-4">
            {paragraph.replace("### ", "")}
          </h3>
        );
      }

      // Lists
      if (paragraph.includes("\n- ")) {
        const items = paragraph.split("\n- ").filter(Boolean);
        return (
          <ul key={idx} className="list-disc list-inside mb-4 space-y-2">
            {items.map((item, i) => (
              <li key={i}>{item.replace(/^- /, "")}</li>
            ))}
          </ul>
        );
      }

      // Numbered lists
      if (/^\d+\. /.test(paragraph)) {
        const items = paragraph.split(/\n\d+\. /).filter(Boolean);
        return (
          <ol key={idx} className="list-decimal list-inside mb-4 space-y-2">
            {items.map((item, i) => (
              <li key={i}>{item.replace(/^\d+\. /, "")}</li>
            ))}
          </ol>
        );
      }

      // Regular paragraphs
      return (
        <p key={idx} className="mb-4 leading-relaxed">
          {paragraph}
        </p>
      );
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
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
                {guide.target_audience}
              </div>
            </div>
          </div>
          <DialogTitle className="text-2xl">{guide.title}</DialogTitle>
          <p className="text-muted-foreground">{guide.description}</p>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="prose prose-sm max-w-none">
            {renderContent(guide.content)}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
