import { toast } from "@/hooks/use-toast";
import { getFullErrorText } from "@/lib/errorUtils";

/**
 * Shows a persistent error toast with a copy button for debugging.
 * Use this for any error that users might need to report or debug.
 * 
 * @param context - A short description of what operation failed (e.g., "Loading data", "Saving changes")
 * @param error - The error object or message
 * 
 * @example
 * try {
 *   await someOperation();
 * } catch (error) {
 *   showErrorToastWithCopy("Saving profile", error);
 * }
 */
export function showErrorToastWithCopy(context: string, error: unknown) {
  const fullText = getFullErrorText(error);
  const textToCopy = `${context}: ${fullText}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      toast({
        title: "Copied to clipboard",
        duration: 2000,
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      // Still show a message - user can manually select and copy
      toast({
        title: "Copy failed",
        description: "Please manually select and copy the error text",
        duration: 3000,
      });
    }
  };

  toast({
    title: context,
    description: (
      <div className="mt-2 space-y-2">
        <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs whitespace-pre-wrap break-all text-foreground select-all">
          {fullText}
        </pre>
        <button
          type="button"
          onPointerDown={handleCopy}
          className="text-xs underline hover:no-underline text-foreground/80 hover:text-foreground cursor-pointer select-none"
        >
          Copy error details
        </button>
      </div>
    ),
    variant: "destructive",
    duration: Infinity, // Persistent until dismissed
  });
}

/**
 * Shows a persistent error toast with copy button.
 * 
 * @param message - The error message to display
 */
export function showErrorToast(message: string) {
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(message);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = message;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      toast({
        title: "Copied to clipboard",
        duration: 2000,
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: "Copy failed",
        description: "Please manually select and copy the error text",
        duration: 3000,
      });
    }
  };

  toast({
    title: "Error",
    description: (
      <div className="mt-2 space-y-2">
        <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs whitespace-pre-wrap break-all text-foreground select-all">
          {message}
        </pre>
        <button
          type="button"
          onPointerDown={handleCopy}
          className="text-xs underline hover:no-underline text-foreground/80 hover:text-foreground cursor-pointer select-none"
        >
          Copy error details
        </button>
      </div>
    ),
    variant: "destructive",
    duration: Infinity,
  });
}
