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
    title: `Error: ${context}`,
    description: (
      <div className="mt-2 space-y-2">
        <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs whitespace-pre-wrap break-all">
          {fullText}
        </pre>
        <button
          onClick={() => {
            navigator.clipboard.writeText(fullText);
            toast({
              title: "Copied to clipboard",
              duration: 2000,
            });
          }}
          className="text-xs underline hover:no-underline"
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
 * This is an alias for showErrorToastWithCopy for simple string errors.
 * 
 * @param message - The error message to display
 */
export function showErrorToast(message: string) {
  showErrorToastWithCopy("Error", message);
}
