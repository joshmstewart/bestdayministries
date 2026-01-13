import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { HelpCircle, ExternalLink } from "lucide-react";
import { TextToSpeech } from "@/components/TextToSpeech";

interface ContextualHelpTooltipProps {
  /** Short tooltip text shown on hover */
  tip: string;
  /** Optional longer description shown in popover */
  description?: string;
  /** Optional link to related guide */
  guideLink?: string;
  /** Size of the help icon */
  size?: "sm" | "md" | "lg";
  /** Position of the tooltip */
  side?: "top" | "right" | "bottom" | "left";
  /** Whether to show TTS button */
  showTTS?: boolean;
  /** Custom className for the trigger button */
  className?: string;
}

const sizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function ContextualHelpTooltip({
  tip,
  description,
  guideLink,
  size = "sm",
  side = "top",
  showTTS = false,
  className = "",
}: ContextualHelpTooltipProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const hasExtendedContent = description || guideLink;

  // Simple tooltip for short tips without extended content
  if (!hasExtendedContent) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={`inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ${className}`}
              aria-label="Help"
            >
              <HelpCircle className={sizeClasses[size]} />
            </button>
          </TooltipTrigger>
          <TooltipContent side={side} className="max-w-xs">
            <p>{tip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Popover for extended content
  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ${className}`}
          aria-label="Help"
        >
          <HelpCircle className={sizeClasses[size]} />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} className="w-80">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <p className="font-medium text-sm flex-1">{tip}</p>
            {showTTS && <TextToSpeech text={`${tip}. ${description || ""}`} size="sm" />}
          </div>
          
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
          
          {guideLink && (
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto text-primary"
              asChild
            >
              <a href={guideLink} target="_blank" rel="noopener noreferrer">
                Learn more
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
