import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface NewsletterPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  previewText: string;
  htmlContent: string;
}

export const NewsletterPreviewDialog = ({
  open,
  onOpenChange,
  subject,
  previewText,
  htmlContent,
}: NewsletterPreviewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Email Preview</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {/* Email header preview */}
          <div className="bg-muted/30 px-6 py-4 border-b">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Subject:</div>
              <div className="font-semibold">{subject || "(No subject)"}</div>
              {previewText && (
                <>
                  <div className="text-xs text-muted-foreground mt-2">Preview text:</div>
                  <div className="text-sm text-muted-foreground">{previewText}</div>
                </>
              )}
            </div>
          </div>

          {/* Email content preview */}
          <div className="bg-white">
            <div 
              className="prose prose-sm max-w-none p-6"
              dangerouslySetInnerHTML={{ __html: htmlContent || '<p class="text-muted-foreground text-center py-8">No content to preview</p>' }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
