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
    const { packName, generateOnly, existingItems } = await req.json();
    
    if (!packName) {
      throw new Error("Pack name is required");
    }

    // generateOnly can be: "all" (default), "description", "style", or "items"
    const mode = generateOnly || "all";
    
    // existingItems is an optional array of item names to exclude from suggestions
    const itemsToExclude: string[] = existingItems || [];

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
      userPrompt = `Generate ONLY a visual style description for a memory match card pack called "${packName}".

CRITICAL STYLE REQUIREMENTS - ALL GENERATED IMAGES WILL BE:
- REALISTIC ILLUSTRATIONS or PHOTOREALISTIC renders (NOT flat, NOT cartoon, NOT stylized icons)
- Natural, accurate colors for subjects (e.g., a rocket is white/silver/red, coffee beans are brown)
- High-detail, clean renders - like premium stock photos or product renders
- Subjects fill 70-80% of the image with crisp, clear details
- ALL backgrounds are CLEAN WHITE (#FFFFFF) - this is non-negotiable

Your description should specify:
1. The realistic rendering style appropriate for "${packName}"
2. What kinds of subjects will be shown (concrete objects related to the theme)
3. Mention that all items appear on clean white backgrounds

Example for "Coffee Shop":
"Photorealistic renders of coffee shop essentials - steaming ceramic mugs, freshly roasted beans with natural brown tones, golden flaky croissants, and polished espresso machines. Each item is rendered with natural textures and accurate colors against a clean white background."

Example for "Space":
"Realistic illustrations of space exploration - detailed rockets with metallic silver and red accents, astronauts in white suits, planets with natural surface textures, and high-tech satellites. Each subject is rendered with accurate colors and realistic details against a crisp white background."

DO NOT generate: "flat illustrations", "simple shapes", "bold silhouettes", "cartoon style", "colored backgrounds"`;

      toolParams = {
        design_style: { type: "string", description: "Visual style description emphasizing REALISTIC/PHOTOREALISTIC rendering with natural colors on WHITE backgrounds" }
      };
      requiredFields = ["design_style"];
    } else if (mode === "colors") {
      userPrompt = `Generate harmonious color scheme for a memory match card game pack called "${packName}".

You need to provide TWO hex colors:
1. background_glow: A warm, themed accent color for the outer glow/aura around the game area. Should complement the pack theme.
2. module_color: The background color for the main card area. Usually white (#FFFFFF) or a soft off-white/cream for readability, but can be lightly tinted to match the theme.

Examples:
- Coffee Shop: background_glow=#8B4513 (coffee brown), module_color=#FFF8F0 (warm cream)
- Space: background_glow=#1E3A5F (deep space blue), module_color=#F0F4FF (cool white)
- Ocean: background_glow=#0077B6 (ocean blue), module_color=#F0FFFF (azure white)
- Garden: background_glow=#228B22 (forest green), module_color=#F5FFF5 (mint cream)
- Bakery: background_glow=#D2691E (warm orange-brown), module_color=#FFFAF0 (floral white)

The module_color should always be very light (near white) for good card visibility, just with a subtle tint.`;

      toolParams = {
        background_glow: { type: "string", description: "Hex color for the warm glow effect (e.g. #8B4513)" },
        module_color: { type: "string", description: "Hex color for the card area background, usually near-white (e.g. #FFFFFF)" }
      };
      requiredFields = ["background_glow", "module_color"];
    } else if (mode === "items") {
      // Build exclusion instructions if there are existing items
      const exclusionNote = itemsToExclude.length > 0
        ? `\n\nEXCLUDE THESE ITEMS - they already exist in the pack: ${itemsToExclude.join(", ")}\nGenerate DIFFERENT items that are NOT on this list.`
        : "";
      
      userPrompt = `Generate 15-20 suggested items for a memory match card pack called "${packName}".

CRITICAL REQUIREMENTS:
- Items must be CONCRETE, DRAWABLE OBJECTS or THINGS - NOT movies, books, songs, or abstract concepts
- Each item should be easily illustrated as a realistic icon
- Items should be visually DISTINCT from each other
- Mix obvious/simple items with a few more interesting ones
- Keep names SHORT (1-3 words max)
- Generate at least 15 items so the game has variety each play
${exclusionNote}

GOOD examples for a "Space" pack: Rocket, Astronaut, Moon, Saturn, Alien, UFO, Comet, Space Helmet, Telescope, Mars Rover, Space Station, Meteor, Nebula, Black Hole, Satellite
BAD examples: "Interstellar", "2001: A Space Odyssey", "The Martian" (these are movies, not drawable objects!)

GOOD examples for an "Ocean" pack: Whale, Octopus, Anchor, Submarine, Coral, Seahorse, Treasure Chest, Starfish, Jellyfish, Shark, Dolphin, Crab, Lobster, Pearl, Seashell
BAD examples: "Finding Nemo", "The Little Mermaid", "Ocean's Eleven" (movies/media, not objects!)`;
      toolParams = {
        suggested_items: { type: "array", items: { type: "string" }, description: "15-20 SHORT names of concrete, drawable objects - NOT movies, books, or abstract concepts. Do not include any items from the exclusion list." }
      };
      requiredFields = ["suggested_items"];
    } else {
      // mode === "all"
      userPrompt = `Generate content for a memory match card pack called "${packName}". Include a description, 15-20 item suggestions, and a visual style. Everything should be adult-appropriate.`;
      toolParams = {
        description: { type: "string", description: "A short 1-2 sentence description of the pack" },
        suggested_items: { type: "array", items: { type: "string" }, description: "15-20 suggested item names that fit this pack theme" },
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
    if (result.background_glow) responseData.backgroundGlow = result.background_glow;
    if (result.module_color) responseData.moduleColor = result.module_color;

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
