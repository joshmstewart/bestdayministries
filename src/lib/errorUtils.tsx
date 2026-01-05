import { toast } from "@/hooks/use-toast";

/**
 * Serializes any error-like value into a comprehensive plain-text string
 * that includes name, message, stack, and all extra properties.
 * Safely handles circular references.
 */
export function getFullErrorText(err: unknown): string {
  try {
    if (err instanceof Error) {
      const basic = `${err.name}: ${err.message}`;
      const stack = err.stack ? `\n\nStack:\n${err.stack}` : "";
      const extraProps = Object.fromEntries(
        Object.getOwnPropertyNames(err)
          .filter((key) => !["name", "message", "stack"].includes(key))
          .map((key) => [key, (err as any)[key]])
      );

      let extra = "";
      if (Object.keys(extraProps).length > 0) {
        const seen = new WeakSet();
        const json = JSON.stringify(
          extraProps,
          (key, value) => {
            if (typeof value === "object" && value !== null) {
              if (seen.has(value)) return "[Circular]";
              seen.add(value);
            }
            return value;
          },
          2
        );
        extra = `\n\nExtra:\n${json}`;
      }

      return basic + stack + extra;
    }

    // Non-Error objects (like Supabase errors, Sentry-wrapped objects, etc.)
    if (typeof err === "object" && err !== null) {
      const seen = new WeakSet();
      const json = JSON.stringify(
        err,
        (key, value) => {
          if (typeof value === "object" && value !== null) {
            if (seen.has(value)) return "[Circular]";
            seen.add(value);
          }
          return value;
        },
        2
      );
      return json;
    }

    // Primitives / unknowns
    return String(err);
  } catch (e) {
    // Last resort
    return `Could not serialize error. Original type: ${typeof err}`;
  }
}

/**
 * ⚠️ MANDATORY ERROR TOAST STANDARD ⚠️
 * 
 * ALL error messages in the application MUST use this function.
 * This ensures errors are:
 * - RED (variant: "destructive")
 * - PERSISTENT (duration: Infinity - never auto-dismiss)
 * - COPYABLE (includes copy button for debugging)
 * 
 * DO NOT use toast.error() or toast({ variant: "destructive" }) directly.
 * DO NOT create inline error toasts without copy functionality.
 * 
 * @param context - Brief description of what operation failed (e.g., "Saving settings", "Loading data")
 * @param error - The error object (can be Error, Supabase error, or any object)
 */
export function showErrorToastWithCopy(context: string, error: unknown): void {
  const fullText = getFullErrorText(error);
  
  toast({
    title: `Error: ${context}`,
    description: (
      <div className="space-y-2">
        <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-xs font-mono bg-destructive/10 p-2 rounded">
          {fullText}
        </pre>
        <button
          onClick={() => {
            navigator.clipboard.writeText(fullText);
            toast({
              title: "Copied",
              description: "Full error details copied to clipboard.",
            });
          }}
          className="text-xs underline hover:no-underline font-medium"
        >
          📋 Copy full error details
        </button>
      </div>
    ),
    variant: "destructive",
    duration: Infinity, // NEVER auto-dismiss error toasts
  });
}
