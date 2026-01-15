import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { templateTitle, templateDescription, category, existingTitles } = await req.json();

    if (!templateTitle) {
      throw new Error("Template title is required");
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const existingList = existingTitles?.length 
      ? `\n\nAlready have these designs (DO NOT repeat): ${existingTitles.join(", ")}`
      : "";

    const response = await fetch("https://api.lovable.dev/v1/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: `Generate 10 creative card design ideas for a greeting card pack called "${templateTitle}"${templateDescription ? ` (${templateDescription})` : ""}${category ? `. Category: ${category}` : ""}.${existingList}

Requirements:
- Each idea should be a simple 2-4 word description of a card design
- Ideas should be suitable for a coloring card (line art that can be colored in)
- Focus on the visual subject/scene, not text
- Variety of different designs within the theme
- Examples of good format: "Birthday Cake", "Balloons and Confetti", "Party Hat Cat"

Return ONLY a JSON array of strings, no explanation. Example: ["Design 1", "Design 2", "Design 3"]`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${response.status}`);
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

    return new Response(
      JSON.stringify({ ideas }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
