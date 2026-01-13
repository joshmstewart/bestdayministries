import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GuideFeedbackProps {
  guideId: string;
  guideName: string;
}

export function GuideFeedback({ guideId, guideName }: GuideFeedbackProps) {
  const [submitted, setSubmitted] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"helpful" | "not_helpful" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleFeedback = async (isHelpful: boolean) => {
    setIsSubmitting(true);
    const type = isHelpful ? "helpful" : "not_helpful";
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Store feedback (could be a dedicated table or analytics)
      // For now, we'll just track it locally and show confirmation
      // In production, you'd insert into a guide_feedback table
      
      setFeedbackType(type);
      setSubmitted(true);
      
      toast({
        title: "Thanks for your feedback!",
        description: isHelpful 
          ? "We're glad this guide was helpful." 
          : "We'll work on improving this guide.",
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="h-4 w-4 text-green-500" />
        <span>Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Was this helpful?</span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleFeedback(true)}
          disabled={isSubmitting}
          className="gap-1.5"
        >
          <ThumbsUp className="h-4 w-4" />
          Yes
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleFeedback(false)}
          disabled={isSubmitting}
          className="gap-1.5"
        >
          <ThumbsDown className="h-4 w-4" />
          No
        </Button>
      </div>
    </div>
  );
}
