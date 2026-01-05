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
    const { packName, generateOnly } = await req.json();
    
    if (!packName) {
      throw new Error("Pack name is required");
    }

    // generateOnly can be: "all" (default), "description", "style", or "items"
    const mode = generateOnly || "all";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating content for pack: ${packName}, mode: ${mode}`);

    // Build prompt based on mode
    let systemPrompt = "You are a creative writer for a memory match card game designed for ADULTS with special needs. Content should be fun and appealing but NOT childish or cartoonish.";
    let userPrompt = "";
    let toolParams: Record<string, any> = {};
    let requiredFields: string[] = [];

    if (mode === "description") {
      userPrompt = `Generate ONLY a short 1-2 sentence description for a memory match card pack called "${packName}".`;
      toolParams = {
        description: { type: "string", description: "A short 1-2 sentence description of the pack" }
      };
      requiredFields = ["description"];
    } else if (mode === "style") {
      userPrompt = `Generate ONLY a visual style description for a memory match card pack called "${packName}". The style should be elegant, sophisticated, and adult-appropriate.`;
      toolParams = {
        design_style: { type: "string", description: "A visual style description for generating card images. Describe colors, art style, and mood. Should be elegant and adult-appropriate." }
      };
      requiredFields = ["design_style"];
    } else if (mode === "items") {
      userPrompt = `Generate ONLY 10-12 suggested item names for a memory match card pack called "${packName}".`;
      toolParams = {
        suggested_items: { type: "array", items: { type: "string" }, description: "10-12 suggested item names that fit this pack theme" }
      };
      requiredFields = ["suggested_items"];
    } else {
      // mode === "all"
      userPrompt = `Generate content for a memory match card pack called "${packName}". Include a description, 10-12 item suggestions, and a visual style. Everything should be adult-appropriate.`;
      toolParams = {
        description: { type: "string", description: "A short 1-2 sentence description of the pack" },
        suggested_items: { type: "array", items: { type: "string" }, description: "10-12 suggested item names that fit this pack theme" },
        design_style: { type: "string", description: "A visual style description. Elegant, adult-appropriate, describing colors, art style, mood." }
      };
      requiredFields = ["description", "suggested_items", "design_style"];
    }

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
              name: "generate_pack_content",
              description: "Generate content for a memory match pack",
              parameters: {
                type: "object",
                properties: toolParams,
                required: requiredFields,
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

    // Return only what was requested
    const responseData: Record<string, any> = {};
    if (result.description) responseData.description = result.description;
    if (result.suggested_items) responseData.suggestedItems = result.suggested_items;
    if (result.design_style) responseData.designStyle = result.design_style;

    return new Response(
      JSON.stringify(responseData),
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
