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

  toast({
    title: context,
    description: (
      <div className="mt-2 space-y-2">
        <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs whitespace-pre-wrap break-all text-foreground">
          {fullText}
        </pre>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(`${context}: ${fullText}`);
            toast({
              title: "Copied to clipboard",
              duration: 2000,
            });
          }}
          className="text-xs underline hover:no-underline text-foreground/80 hover:text-foreground"
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
  toast({
    title: "Error",
    description: (
      <div className="mt-2 space-y-2">
        <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs whitespace-pre-wrap break-all text-foreground">
          {message}
        </pre>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(message);
            toast({
              title: "Copied to clipboard",
              duration: 2000,
            });
          }}
          className="text-xs underline hover:no-underline text-foreground/80 hover:text-foreground"
        >
          Copy error details
        </button>
      </div>
    ),
    variant: "destructive",
    duration: Infinity,
  });
}
