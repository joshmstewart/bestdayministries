import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) throw new Error("url is required");

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    console.log("Fetching logos from:", url);

    // Scrape the page for branding + links + html
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["html", "links", "screenshot"],
        onlyMainContent: false,
      }),
    });

    const scrapeData = await scrapeResponse.json();
    if (!scrapeResponse.ok) {
      throw new Error(`Firecrawl error: ${JSON.stringify(scrapeData)}`);
    }

    const html = scrapeData.data?.html || scrapeData.html || "";
    const allLinks = scrapeData.data?.links || scrapeData.links || [];

    const candidateLogos: { url: string; source: string; confidence: number }[] = [];
    const seen = new Set<string>();

    const addCandidate = (imgUrl: string, source: string, confidence: number) => {
      if (!imgUrl || seen.has(imgUrl)) return;
      // Skip data URIs, tiny tracking pixels, SVG data
      if (imgUrl.startsWith("data:") && imgUrl.length < 200) return;
      seen.add(imgUrl);
      // Make absolute URLs
      let absoluteUrl = imgUrl;
      try {
        absoluteUrl = new URL(imgUrl, url).href;
      } catch { /* keep as-is */ }
      candidateLogos.push({ url: absoluteUrl, source, confidence });
    };

    // 1. Look for og:image (often the logo or event branding)
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogImageMatch?.[1]) {
      addCandidate(ogImageMatch[1], "og:image", 70);
    }

    // 2. Look for apple-touch-icon / shortcut icon / favicon
    const iconPatterns = [
      { regex: /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/gi, source: "apple-touch-icon", confidence: 80 },
      { regex: /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/gi, source: "apple-touch-icon", confidence: 80 },
      { regex: /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/gi, source: "favicon", confidence: 60 },
      { regex: /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/gi, source: "favicon", confidence: 60 },
    ];

    for (const { regex, source, confidence } of iconPatterns) {
      let match;
      while ((match = regex.exec(html)) !== null) {
        addCandidate(match[1], source, confidence);
      }
    }

    // 3. Look for images with "logo" in src, alt, class, or id
    const imgTagRegex = /<img[^>]+>/gi;
    let imgMatch;
    while ((imgMatch = imgTagRegex.exec(html)) !== null) {
      const tag = imgMatch[0];
      const srcMatch = tag.match(/src=["']([^"']+)["']/i);
      const altMatch = tag.match(/alt=["']([^"']*?)["']/i);
      const classMatch = tag.match(/class=["']([^"']*?)["']/i);
      const idMatch = tag.match(/id=["']([^"']*?)["']/i);

      if (!srcMatch?.[1]) continue;

      const src = srcMatch[1];
      const alt = (altMatch?.[1] || "").toLowerCase();
      const cls = (classMatch?.[1] || "").toLowerCase();
      const id = (idMatch?.[1] || "").toLowerCase();
      const srcLower = src.toLowerCase();

      const isLogo = /logo/i.test(srcLower) || /logo/i.test(alt) || /logo/i.test(cls) || /logo/i.test(id);
      const isBrand = /brand/i.test(srcLower) || /brand/i.test(alt) || /brand/i.test(cls);
      const isHeader = /header/i.test(cls) || /header/i.test(id) || /nav/i.test(cls);
      const isBanner = /banner/i.test(srcLower) || /banner/i.test(alt) || /hero/i.test(cls);

      if (isLogo) {
        addCandidate(src, "img[logo]", 90);
      } else if (isBrand) {
        addCandidate(src, "img[brand]", 75);
      } else if (isHeader) {
        addCandidate(src, "img[header]", 65);
      } else if (isBanner) {
        addCandidate(src, "img[banner/hero]", 50);
      }
    }

    // 4. Check for SVG logos embedded as background-image or in style tags
    const bgImageRegex = /background(?:-image)?:\s*url\(['"]?([^'")\s]+\.(?:png|jpg|jpeg|svg|webp))['"]?\)/gi;
    let bgMatch;
    while ((bgMatch = bgImageRegex.exec(html)) !== null) {
      const bgUrl = bgMatch[1].toLowerCase();
      if (/logo|brand/i.test(bgUrl)) {
        addCandidate(bgMatch[1], "css-background[logo]", 70);
      }
    }

    // 5. Try common favicon/logo paths as fallbacks
    const baseUrl = new URL(url);
    const commonPaths = [
      "/favicon.ico",
      "/apple-touch-icon.png",
      "/logo.png",
      "/logo.svg",
      "/images/logo.png",
      "/img/logo.png",
      "/assets/logo.png",
    ];

    for (const path of commonPaths) {
      const fullUrl = `${baseUrl.origin}${path}`;
      if (!seen.has(fullUrl)) {
        try {
          const headResp = await fetch(fullUrl, { method: "HEAD", redirect: "follow" });
          if (headResp.ok) {
            const contentType = headResp.headers.get("content-type") || "";
            if (contentType.startsWith("image/")) {
              addCandidate(fullUrl, `common-path[${path}]`, /logo/i.test(path) ? 60 : 40);
            }
          }
        } catch { /* skip */ }
      }
    }

    // Sort by confidence descending
    candidateLogos.sort((a, b) => b.confidence - a.confidence);

    // Cap at 8 results
    const results = candidateLogos.slice(0, 8);

    console.log(`Found ${results.length} logo candidates`);

    return new Response(
      JSON.stringify({ success: true, logos: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching logos:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
