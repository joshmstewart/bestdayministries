import { useEffect, useState } from "react";

interface LiveRegionProps {
  message: string;
  politeness?: "polite" | "assertive";
  clearAfter?: number;
}

/**
 * Live Region component for announcing dynamic content changes
 * WCAG 2.1 Success Criterion 4.1.3 - Status Messages
 * Use for: form validation errors, loading states, action confirmations
 */
export const LiveRegion = ({ 
  message, 
  politeness = "polite",
  clearAfter = 5000 
}: LiveRegionProps) => {
  const [announcement, setAnnouncement] = useState(message);

  useEffect(() => {
    setAnnouncement(message);
    
    if (clearAfter && message) {
      const timer = setTimeout(() => {
        setAnnouncement("");
      }, clearAfter);
      
      return () => clearTimeout(timer);
    }
  }, [message, clearAfter]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
};

/**
 * Hook for programmatic announcements to screen readers
 */
export const useAnnounce = () => {
  const [message, setMessage] = useState("");
  const [politeness, setPoliteness] = useState<"polite" | "assertive">("polite");

  const announce = (text: string, level: "polite" | "assertive" = "polite") => {
    // Clear first to ensure re-announcement of same message
    setMessage("");
    setPoliteness(level);
    
    // Use requestAnimationFrame to ensure DOM update
    requestAnimationFrame(() => {
      setMessage(text);
    });
  };

  return { message, politeness, announce };
};
