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
    const { url, deepCrawl } = await req.json();
    if (!url) throw new Error("url is required");

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    console.log("Extracting race info from:", url, "deepCrawl:", !!deepCrawl);

    let allMarkdown = "";
    let allImageUrls: string[] = [];
    let allLinks: string[] = [];
    let metadata: any = {};

    if (deepCrawl) {
      // Step 1a: Map the site to discover all pages
      console.log("Mapping site to discover pages...");
      const mapResponse = await fetch("https://api.firecrawl.dev/v1/map", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          limit: 50,
          includeSubdomains: false,
        }),
      });

      const mapData = await mapResponse.json();
      const discoveredUrls = mapData.links || mapData.data?.links || [];
      console.log(`Discovered ${discoveredUrls.length} pages on site`);

      // Filter to relevant pages (photos, gallery, route, course, about, etc.)
      const relevantKeywords = /photo|gallery|image|route|course|about|info|detail|overview|scenic|ride|event|register|media/i;
      const relevantUrls = discoveredUrls
        .filter((u: string) => relevantKeywords.test(u) || u === url)
        .slice(0, 8); // Cap at 8 pages to stay within limits

      // Always include the main URL
      if (!relevantUrls.includes(url)) {
        relevantUrls.unshift(url);
      }

      console.log(`Scraping ${relevantUrls.length} relevant pages:`, relevantUrls);

      // Step 1b: Scrape each relevant page
      for (const pageUrl of relevantUrls) {
        try {
          const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: pageUrl,
              formats: ["markdown", "links"],
              onlyMainContent: true,
            }),
          });

          if (!scrapeResponse.ok) {
            console.log(`Failed to scrape ${pageUrl}: ${scrapeResponse.status}`);
            continue;
          }

          const scrapeData = await scrapeResponse.json();
          const pageMarkdown = scrapeData.data?.markdown || scrapeData.markdown || "";
          const pageLinks = scrapeData.data?.links || scrapeData.links || [];
          const pageMeta = scrapeData.data?.metadata || scrapeData.metadata || {};

          // Collect the main page metadata
          if (pageUrl === url) {
            metadata = pageMeta;
          }

          allMarkdown += `\n\n--- PAGE: ${pageUrl} ---\n${pageMarkdown}`;
          allLinks.push(...pageLinks);

          // Extract image URLs from links and markdown
          const imageLinks = pageLinks.filter((l: string) => /\.(jpg|jpeg|png|webp|gif)/i.test(l));
          allImageUrls.push(...imageLinks);

          // Also extract image URLs from markdown ![alt](url) patterns
          const mdImageMatches = pageMarkdown.matchAll(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/g);
          for (const match of mdImageMatches) {
            allImageUrls.push(match[1]);
          }

          // Extract src= image patterns from any inline HTML
          const srcMatches = pageMarkdown.matchAll(/src=["'](https?:\/\/[^"']+\.(jpg|jpeg|png|webp|gif)[^"']*)/gi);
          for (const match of srcMatches) {
            allImageUrls.push(match[1]);
          }

          console.log(`Scraped ${pageUrl}: ${pageMarkdown.length} chars, ${imageLinks.length} images`);
        } catch (err) {
          console.log(`Error scraping ${pageUrl}:`, err);
        }
      }
    } else {
      // Simple single-page scrape (original behavior)
      console.log("Single page scrape:", url);
      const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: ["markdown", "links"],
          onlyMainContent: true,
        }),
      });

      const scrapeData = await scrapeResponse.json();
      if (!scrapeResponse.ok) {
        console.error("Firecrawl error:", scrapeData);
        throw new Error(`Scrape failed: ${scrapeData.error || scrapeResponse.status}`);
      }

      allMarkdown = scrapeData.data?.markdown || scrapeData.markdown || "";
      allLinks = scrapeData.data?.links || scrapeData.links || [];
      metadata = scrapeData.data?.metadata || scrapeData.metadata || {};
      allImageUrls = allLinks.filter((l: string) => /\.(jpg|jpeg|png|webp|gif)/i.test(l));
    }

    // Deduplicate images and filter out tiny icons/logos
    const uniqueImages = [...new Set(allImageUrls)].filter(imgUrl => {
      const lower = imgUrl.toLowerCase();
      // Filter out common non-scenic images
      return !lower.includes('logo') &&
             !lower.includes('favicon') &&
             !lower.includes('icon') &&
             !lower.includes('avatar') &&
             !lower.includes('badge') &&
             !lower.includes('sprite') &&
             !lower.includes('1x1') &&
             !lower.includes('pixel') &&
             !lower.includes('tracking') &&
             !lower.includes('analytics');
    });

    console.log(`Total unique images found: ${uniqueImages.length}`);

    // Step 2: Use AI to extract structured race info
    const prompt = `Analyze this race/cycling event page content and extract ALL available information.

PAGE CONTENT (from ${deepCrawl ? 'multiple pages' : 'single page'}):
${allMarkdown.substring(0, 15000)}

PAGE METADATA:
Title: ${metadata.title || ""}
Description: ${metadata.description || ""}

ALL ${uniqueImages.length} IMAGE URLs FOUND ACROSS THE SITE:
${uniqueImages.slice(0, 30).join("\n")}

ROUTE/MAP LINKS FOUND:
${allLinks.filter((l: string) => /ridewithgps|strava|mapmy|komoot/i.test(l)).slice(0, 10).join("\n")}

Extract ALL of the following information and return as JSON. Use null for any field you can't determine.

For the "images" field: From the image URLs provided, select the BEST images that show scenic mountain/road views, course highlights, riders on the route, finish line, start line, landscapes, etc. Prefer large/high-resolution images. Exclude sponsor logos, social media icons, headshots, and small thumbnails. Include UP TO 15 of the best scenic/event images.

{
  "title": "Event/race title",
  "description": "A 2-3 sentence description of the race suitable for a fundraising pledge page",
  "ride_date": "YYYY-MM-DD format if found",
  "mile_goal": number of miles (convert from km if needed),
  "start_location": "Start city/location",
  "end_location": "End city/location (or same as start for loops)",
  "images": ["array of THE BEST scenic/event image URLs - up to 15"],
  "route_description": "Brief description of the route/terrain",
  "elevation_gain_ft": number of feet of elevation gain (convert from meters if needed, 1m = 3.281ft),
  "difficulty_rating": "Easy, Moderate, Challenging, or Epic - based on distance and elevation",
  "key_climbs": ["array of named mountain passes or significant climbs mentioned"],
  "aid_stations": [{"name": "Station Name", "mile": approximate mile marker, "services": "what's available"}],
  "start_time": "Start time like '5:15 AM' if mentioned",
  "registration_url": "URL for registration/sign-up if found",
  "finish_description": "What happens at the finish line (party, food, ceremony, etc.)",
  "ridewithgps_url": "Ride With GPS URL if found, or any interactive route map URL"
}

Return ONLY valid JSON, no other text.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error(`AI extraction failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    console.log("AI response:", content.substring(0, 500));

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse AI response");

    const extracted = JSON.parse(jsonMatch[0]);
    console.log("Extracted race info:", JSON.stringify(extracted).substring(0, 500));
    console.log(`Returning ${extracted.images?.length || 0} images`);

    return new Response(
      JSON.stringify({
        success: true,
        data: extracted,
        source_url: url,
        pages_crawled: deepCrawl ? "multiple" : 1,
        total_images_found: uniqueImages.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error extracting race info:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
