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
    const { existingTitles } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build exclusion list from existing books
    const existingList = Array.isArray(existingTitles) && existingTitles.length > 0
      ? existingTitles.map((t: string) => t.toLowerCase().trim())
      : [];

    console.log(`Generating coloring book ideas, excluding ${existingList.length} existing books:`, existingList);

    const systemPrompt = `You are a creative designer for children's coloring books. You suggest engaging, diverse coloring book themes that appeal to kids and adults with IDD (intellectual and developmental disabilities). Mix fantastical/magical themes with real-world subjects. Each book should have a clear visual theme that can generate 10-20 pages.`;

    const exclusionNote = existingList.length > 0
      ? `\n\nDO NOT SUGGEST any of these (they already exist): ${existingList.join(", ")}`
      : '';

    const userPrompt = `Generate 20 creative coloring book ideas. Include a mix of:
- Fantastical/magical themes (unicorns, dragons, fairies, space, underwater kingdoms)
- Nature & animals (safari, ocean life, butterflies, dinosaurs, pets)
- Vehicles & machines (trucks, trains, rockets, robots)
- Seasonal & holiday themes (Christmas, Halloween, spring flowers)
- Pop culture inspired (superheroes, princesses, pirates)
- Calming/therapeutic (mandalas, patterns, gardens)
- Educational (alphabet, numbers, shapes, maps)

For each idea, provide:
1. A catchy title (2-4 words)
2. A brief description (1-2 sentences) describing the theme and what kinds of pages it would include
${exclusionNote}

Make the titles fun and engaging!`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_book_ideas",
              description: "Generate coloring book theme ideas",
              parameters: {
                type: "object",
                properties: {
                  ideas: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short catchy title (2-4 words)" },
                        description: { type: "string", description: "Brief theme description (1-2 sentences)" }
                      },
                      required: ["title", "description"]
                    },
                    description: "20 coloring book ideas with titles and descriptions"
                  }
                },
                required: ["ideas"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_book_ideas" } }
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
    console.log("AI response received");

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call response from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ ideas: result.ideas || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating book ideas:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
