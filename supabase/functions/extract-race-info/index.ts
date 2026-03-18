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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    console.log("Scraping race URL:", url);

    // Step 1: Scrape the race page with Firecrawl
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

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const links = scrapeData.data?.links || scrapeData.links || [];
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    console.log("Scraped content length:", markdown.length, "links:", links.length);

    // Step 2: Use AI to extract structured race info
    const prompt = `Analyze this race/cycling event page content and extract ALL available information.

PAGE CONTENT:
${markdown.substring(0, 12000)}

PAGE METADATA:
Title: ${metadata.title || ""}
Description: ${metadata.description || ""}

IMAGE LINKS FOUND ON PAGE:
${links.filter((l: string) => /\.(jpg|jpeg|png|webp|gif)/i.test(l)).slice(0, 20).join("\n")}

ALL LINKS FOUND ON PAGE:
${links.filter((l: string) => /ridewithgps|strava|mapmy|komoot/i.test(l)).slice(0, 10).join("\n")}

Extract ALL of the following information and return as JSON. Use null for any field you can't determine:

{
  "title": "Event/race title",
  "description": "A 2-3 sentence description of the race suitable for a fundraising pledge page",
  "ride_date": "YYYY-MM-DD format if found",
  "mile_goal": number of miles (convert from km if needed),
  "start_location": "Start city/location",
  "end_location": "End city/location (or same as start for loops)",
  "images": ["array of image URLs found on the page that show the route, scenery, or event - up to 5 best ones"],
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

    return new Response(
      JSON.stringify({ success: true, data: extracted, source_url: url }),
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
