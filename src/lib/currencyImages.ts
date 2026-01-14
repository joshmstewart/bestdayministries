// Default currency image imports (fallbacks)
import bill100 from "@/assets/currency/bill-100.png";
import bill50 from "@/assets/currency/bill-50.png";
import bill20 from "@/assets/currency/bill-20.png";
import bill10 from "@/assets/currency/bill-10.png";
import bill5 from "@/assets/currency/bill-5.png";
import bill1 from "@/assets/currency/bill-1.png";
import coinQuarter from "@/assets/currency/coin-quarter.png";
import coinDime from "@/assets/currency/coin-dime.png";
import coinNickel from "@/assets/currency/coin-nickel.png";
import coinPenny from "@/assets/currency/coin-penny.png";

// Default static images (used as fallback when no custom image is set)
export const CURRENCY_IMAGES: { [key: string]: string } = {
  "100": bill100,
  "50": bill50,
  "20": bill20,
  "10": bill10,
  "5": bill5,
  "1": bill1,
  "0.25": coinQuarter,
  "0.10": coinDime,
  "0.1": coinDime,
  "0.05": coinNickel,
  "0.01": coinPenny,
};

// Cache for database-loaded custom images
let customCurrencyImages: { [key: string]: string } | null = null;

export async function loadCustomCurrencyImages(): Promise<{ [key: string]: string }> {
  if (customCurrencyImages !== null) {
    return customCurrencyImages;
  }

  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase
      .from("currency_images")
      .select("denomination, image_url")
      .eq("is_active", true);

    if (error) {
      console.error("Error loading custom currency images:", error);
      return {};
    }

    customCurrencyImages = {};
    for (const row of data || []) {
      if (row.image_url) {
        customCurrencyImages[row.denomination] = row.image_url;
        // Also handle alternate denomination formats
        if (row.denomination === "0.10") {
          customCurrencyImages["0.1"] = row.image_url;
        }
      }
    }

    return customCurrencyImages;
  } catch (error) {
    console.error("Error loading custom currency images:", error);
    return {};
  }
}

// Invalidate cache when images are updated
export function invalidateCurrencyImageCache() {
  customCurrencyImages = null;
}

// Get currency image - prefers custom, falls back to default
export function getCurrencyImage(denomination: string, customImages?: { [key: string]: string }): string | undefined {
  // If custom images are provided and have this denomination, use it
  if (customImages && customImages[denomination]) {
    return customImages[denomination];
  }
  // Otherwise fall back to static default
  return CURRENCY_IMAGES[denomination];
}
