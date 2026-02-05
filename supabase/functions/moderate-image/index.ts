import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Moderating image:", imageUrl);

    const systemPrompt = `You are an image moderation assistant for Joy House, a supportive community platform serving individuals with intellectual and developmental disabilities and their caregivers.

Analyze images for inappropriate content and determine if they violate community guidelines.

## Content Guidelines - FLAG images that contain:

**HIGH Severity - Immediate Flag:**
- Explicit sexual content, nudity, or pornography
- Graphic violence, gore, or disturbing imagery
- Hate symbols, racist imagery, or discriminatory content
- Illegal activities or dangerous behavior
- Weapons or threatening imagery

**MEDIUM Severity - Flag for Review:**
- Suggestive or inappropriate content
- Bullying or harassment imagery
- Disturbing or potentially triggering content
- Inappropriate gestures or symbols

**LOW Severity - Flag for Review:**
- Mildly inappropriate content
- Content that may be unsuitable for all ages

## DO NOT FLAG (These are acceptable):
- Family photos, selfies, group photos
- Celebrations, events, activities
- Nature, landscapes, pets, food
- Art, crafts, creative projects
- Daily life moments and memories
- Professional photos
- Educational content

**Key Principle: This is a family-friendly support community. Only flag content that is clearly inappropriate or potentially harmful.**

## Response Format:
Respond with a JSON object containing:
- "approved": boolean (true if image is acceptable, false if it should be flagged)
- "reason": string (brief explanation if flagged, empty string if approved)
- "severity": "low" | "medium" | "high" (only if flagged, empty string if approved)

Examples:
- Family photo → {"approved": true, "reason": "", "severity": ""}
- Explicit content → {"approved": false, "reason": "Contains explicit sexual content", "severity": "high"}
- Celebration photo → {"approved": true, "reason": "", "severity": ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              {
                type: "text",
                text: "Please moderate this image according to the community guidelines."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI moderation failed");
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    console.log("Image moderation result:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in moderate-image:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        // Fail open - allow image if moderation fails
        approved: true,
        reason: "Image moderation check failed",
        severity: ""
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
