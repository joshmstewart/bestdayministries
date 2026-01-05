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
    const { packName } = await req.json();
    
    if (!packName) {
      throw new Error("Pack name is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating description for pack: ${packName}`);

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
            content: "You are a creative writer for a memory match card game designed for ADULTS with special needs. Generate short, engaging descriptions for themed card packs. Keep descriptions to 1-2 sentences, fun and appealing but NOT childish. Also suggest an appropriate visual style for the card images - elegant, sophisticated, clean illustrations suitable for adults."
          },
          {
            role: "user",
            content: `Generate content for a memory match card pack called "${packName}". Include a description, 10-12 item suggestions, and a visual style that fits this theme. The style should be adult-appropriate (not childish or cartoonish).`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_pack_content",
              description: "Generate description, suggested card items, and visual style for a memory match pack",
              parameters: {
                type: "object",
                properties: {
                  description: {
                    type: "string",
                    description: "A short 1-2 sentence description of the pack"
                  },
                  suggested_items: {
                    type: "array",
                    items: { type: "string" },
                    description: "10-12 suggested item names that would fit this pack theme"
                  },
                  design_style: {
                    type: "string",
                    description: "A visual style description for generating the card images. Should be elegant and adult-appropriate, describing colors, art style, and mood. Example: 'Watercolor botanical style, soft pastels, delicate linework, white background, sophisticated and calming'"
                  }
                },
                required: ["description", "suggested_items", "design_style"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_pack_content" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call response from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        description: result.description,
        suggestedItems: result.suggested_items,
        designStyle: result.design_style
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating description:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
