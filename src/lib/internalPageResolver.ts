/**
 * Resolves a default title, description, and available images for any internal page
 * selected in the Featured Item Manager. DB-backed pages are fetched live; other
 * pages fall back to the page label + site logo.
 */
import { supabase } from "@/integrations/supabase/client";
import { INTERNAL_PAGES } from "@/lib/internalPages";
import farmTableBg from "@/assets/background_farmtable.png";

export interface ResolvedImage {
  url: string;
  label: string;
}

export interface ResolvedPage {
  title: string;
  description: string;
  images: ResolvedImage[];
}

const pickStr = (obj: any, ...keys: string[]): string => {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
};

const collectImages = (obj: any, mapping: { key: string; label: string }[]): ResolvedImage[] => {
  const seen = new Set<string>();
  const out: ResolvedImage[] = [];
  for (const m of mapping) {
    const url = obj?.[m.key];
    if (typeof url === "string" && url.trim() && !seen.has(url)) {
      seen.add(url);
      out.push({ url, label: m.label });
    }
  }
  return out;
};

async function fetchSectionContent(
  table: "homepage_sections" | "support_page_sections" | "sponsor_page_sections" | "about_sections",
  sectionKey: string,
): Promise<any> {
  const { data } = await supabase
    .from(table)
    .select("content")
    .eq("section_key", sectionKey)
    .maybeSingle();
  return data?.content || {};
}

async function fetchAppSetting(key: string): Promise<any> {
  const { data } = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", key)
    .maybeSingle();
  return data?.setting_value;
}

async function getLogoUrl(): Promise<string> {
  const val = await fetchAppSetting("logo_url");
  if (typeof val === "string") return val;
  return "";
}

export async function resolveInternalPage(route: string): Promise<ResolvedPage> {
  const label = INTERNAL_PAGES.find(p => p.value === route)?.label || route;
  const logo = await getLogoUrl();
  const logoImage: ResolvedImage[] = logo ? [{ url: logo, label: "Site Logo" }] : [];

  try {
    switch (route) {
      case "/": {
        const hero = await fetchSectionContent("homepage_sections", "hero");
        return {
          title: pickStr(hero, "heading") || label,
          description: pickStr(hero, "description", "badge_text"),
          images: [
            ...collectImages(hero, [{ key: "image_url", label: "Hero" }]),
            ...logoImage,
          ],
        };
      }
      case "/about": {
        const about = await fetchSectionContent("homepage_sections", "about");
        return {
          title: pickStr(about, "heading") || "Our Story",
          description: pickStr(about, "story_paragraph1", "doc_description"),
          images: [
            ...collectImages(about, [
              { key: "bde_image_url", label: "Best Day Ever" },
              { key: "doc_image_url", label: "Documentary" },
            ]),
            ...logoImage,
          ],
        };
      }
      case "/coffee-shop": {
        const coffee = (await fetchAppSetting("coffee_shop_content")) || {};
        return {
          title: pickStr(coffee, "hero_heading") || "Best Day Ever Coffee & Crepes",
          description: pickStr(coffee, "hero_subheading", "mission_description"),
          images: [
            ...collectImages(coffee, [{ key: "hero_image_url", label: "Hero" }]),
            ...logoImage,
          ],
        };
      }
      case "/support": {
        const header = await fetchSectionContent("support_page_sections", "header");
        return {
          title: pickStr(header, "heading") || "Support Us",
          description: pickStr(header, "subtitle"),
          images: logoImage,
        };
      }
      case "/sponsor-bestie": {
        const header = await fetchSectionContent("sponsor_page_sections", "header");
        return {
          title: pickStr(header, "main_heading") || "Sponsor a Bestie",
          description: pickStr(header, "description"),
          images: logoImage,
        };
      }
      case "/bike-rides": {
        const { data: rides } = await supabase
          .from("bike_ride_events")
          .select("title, rider_name, description, cover_image_url, rider_image_url")
          .eq("is_active", true)
          .order("ride_date", { ascending: true })
          .limit(6);
        const imgs: ResolvedImage[] = [];
        (rides || []).forEach(r => {
          const tag = r.rider_name || r.title || "Ride";
          if (r.cover_image_url) imgs.push({ url: r.cover_image_url, label: `${tag} – Cover` });
          if (r.rider_image_url) imgs.push({ url: r.rider_image_url, label: `${tag} – Rider` });
        });
        const ridersList = (rides || [])
          .map(r => r.rider_name)
          .filter(Boolean)
          .slice(0, 4)
          .join(", ");
        return {
          title: "Bike Ride Fundraisers",
          description: ridersList
            ? `Cheer on our riders raising funds for Best Day Ministries — ${ridersList}.`
            : "Cheer on our riders raising funds for Best Day Ministries through endurance cycling events.",
          images: [...imgs, ...logoImage],
        };
      }
      case "/night-of-joy": {
        return {
          title: "A Night of Joy Fundraiser",
          description:
            "Join us June 14, 2026 for an unforgettable evening of food, music, and community celebrating our besties. Tickets and sponsorships available.",
          images: [
            { url: farmTableBg, label: "Farm Table Banner" },
            ...logoImage,
          ],
        };
      }
    }
  } catch (err) {
    console.error("[internalPageResolver] failed for", route, err);
  }

  // Generic fallback for all other internal pages
  return {
    title: label,
    description: "",
    images: logoImage,
  };
}
