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
