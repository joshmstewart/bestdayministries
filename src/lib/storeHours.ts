export type StoreDayHours = {
  day: string;
  open: string;
  close: string;
};

const DAY_ORDER: StoreDayHours["day"][] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const normalizeDayKey = (key: string) => key.trim().toLowerCase();

const parseRangeString = (value: string): { open: string; close: string } => {
  const trimmed = value.trim();
  if (!trimmed) return { open: "", close: "" };
  if (trimmed.toLowerCase() === "closed") return { open: "Closed", close: "" };

  // Supports "10am-6pm" and "10am - 6pm" and "10am–6pm"
  const normalized = trimmed.replace(/–/g, "-");
  const parts = normalized.split("-").map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 2) return { open: parts[0], close: parts.slice(1).join(" - ") };
  return { open: trimmed, close: "" };
};

/**
 * Normalizes hours from DB into an array of {day, open, close}.
 * Supports:
 * - Array format: [{day, open, close}, ...]
 * - Map format: { monday: "10am-6pm", ... }
 * - JSON string of either format
 */
export const normalizeStoreHours = (
  raw: unknown,
  fallback: StoreDayHours[] = []
): StoreDayHours[] => {
  if (!raw) return fallback;

  if (typeof raw === "string") {
    try {
      return normalizeStoreHours(JSON.parse(raw), fallback);
    } catch {
      return fallback;
    }
  }

  if (Array.isArray(raw)) {
    const maybe = raw as any[];
    const valid = maybe
      .filter((h) => h && typeof h === "object")
      .map((h) => ({
        day: String((h as any).day ?? "").trim(),
        open: String((h as any).open ?? "").trim(),
        close: String((h as any).close ?? "").trim(),
      }))
      .filter((h) => Boolean(h.day));

    return valid.length ? valid : fallback;
  }

  if (typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const byKey = new Map<string, unknown>(
      Object.entries(record).map(([k, v]) => [normalizeDayKey(k), v])
    );

    const out: StoreDayHours[] = [];
    for (const day of DAY_ORDER) {
      const key = normalizeDayKey(day);
      const val = byKey.get(key);
      if (val == null) continue;

      if (typeof val === "string") {
        const { open, close } = parseRangeString(val);
        out.push({ day, open, close });
      } else if (typeof val === "object" && val) {
        // Support object form: { open: "10am", close: "6pm" }
        const o = val as any;
        out.push({
          day,
          open: String(o.open ?? "").trim(),
          close: String(o.close ?? "").trim(),
        });
      }
    }

    return out.length ? out : fallback;
  }

  return fallback;
};
