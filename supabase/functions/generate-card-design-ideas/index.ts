import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { templateTitle, templateDescription, category, existingTitles } = await req.json();

    if (!templateTitle) {
      throw new Error("Template title is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating design ideas for: ${templateTitle}`);

    const existingList = existingTitles?.length 
      ? `\n\nAlready have these designs (DO NOT repeat): ${existingTitles.join(", ")}`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a creative card designer. Generate design ideas as a JSON array of strings. Return ONLY valid JSON, no markdown or explanation."
          },
          {
            role: "user",
            content: `Generate 10 creative card design ideas for a greeting card pack called "${templateTitle}"${templateDescription ? ` (${templateDescription})` : ""}${category ? `. Category: ${category}` : ""}.${existingList}

Requirements:
- Each idea should be a simple 2-4 word description of a card design
- Ideas should be suitable for a coloring card (line art that can be colored in)
- Focus on the visual subject/scene, not text
- Variety of different designs within the theme
- Examples of good format: "Birthday Cake", "Balloons and Confetti", "Party Hat Cat"

Return ONLY a JSON array of strings. Example: ["Design 1", "Design 2", "Design 3"]`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || "[]";
    
    // Clean up the response - remove markdown code blocks if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    let ideas: string[] = [];
    try {
      ideas = JSON.parse(content);
    } catch {
      // If parsing fails, try to extract ideas from text
      const matches = content.match(/"([^"]+)"/g);
      if (matches) {
        ideas = matches.map((m: string) => m.replace(/"/g, ""));
      }
    }

    console.log(`Generated ${ideas.length} design ideas`);

    return new Response(
      JSON.stringify({ ideas }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating ideas:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
