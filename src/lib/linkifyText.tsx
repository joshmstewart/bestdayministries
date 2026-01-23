import React from "react";

/**
 * Converts URLs in text to clickable links
 */
export function linkifyText(text: string): React.ReactNode[] {
  if (!text) return [];
  
  // Regex to match URLs (http, https, www)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  
  const parts = text.split(urlRegex);
  const matches = text.match(urlRegex) || [];
  
  const result: React.ReactNode[] = [];
  let matchIndex = 0;
  
  parts.forEach((part, index) => {
    if (part) {
      // Check if this part is a URL
      if (urlRegex.test(part)) {
        // Reset regex lastIndex since we're using 'g' flag
        urlRegex.lastIndex = 0;
        
        const href = part.startsWith("www.") ? `https://${part}` : part;
        result.push(
          <a
            key={`link-${index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      } else {
        result.push(<span key={`text-${index}`}>{part}</span>);
      }
    }
  });
  
  return result;
}

/**
 * Component wrapper for linkified text
 */
export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  return <span className={className}>{linkifyText(text)}</span>;
}
