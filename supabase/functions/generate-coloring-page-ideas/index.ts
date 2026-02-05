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
    const { bookTitle, bookDescription, bookTheme, existingTitles } = await req.json();
    
    if (!bookTitle) {
      throw new Error("Book title is required");
    }
    
    console.log(`Book theme/style: ${bookTheme || 'none'}`)

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build exclusion list from existing active pages
    const existingList = Array.isArray(existingTitles) && existingTitles.length > 0
      ? existingTitles.map((t: string) => t.toLowerCase().trim())
      : [];
    
    console.log(`Generating coloring page ideas for: ${bookTitle}`);
    console.log(`Excluding ${existingList.length} existing pages:`, existingList);

    const systemPrompt = "You are a creative designer for coloring books. You suggest simple, appealing subjects that work well as coloring pages with clear outlines. For character-based themes (superheroes, princesses, cartoon characters, etc.), prioritize the actual characters themselves, not just their accessories or items.";
    
    const exclusionNote = existingList.length > 0 
      ? `\n\nCRITICAL - DO NOT SUGGEST ANY OF THESE (they already exist as pages):\n${existingList.join(", ")}\n\nGenerate COMPLETELY NEW ideas that are NOT similar to the above existing pages.`
      : '';
    
    // Build theme/style instruction if provided
    const themeInstruction = bookTheme 
      ? `\n\nVERY IMPORTANT - VISUAL STYLE REQUIREMENT: ALL page ideas MUST be drawn in the style of "${bookTheme}". This means every image should visually incorporate this style/theme. For example, if the theme is "stained glass windows", every subject should look like a stained glass window design with bold lead lines and segmented glass panels. The theme "${bookTheme}" is NOT just a category - it defines HOW each subject should be visually rendered.`
      : '';
    
    const userPrompt = `Generate 15-20 coloring page ideas for a coloring book titled "${bookTitle}"${bookDescription ? `. The book is about: ${bookDescription}` : ''}.${themeInstruction}${exclusionNote}

CRITICAL REQUIREMENTS:
- For character-based themes (superheroes, princesses, cartoon characters, movies, TV shows), suggest THE ACTUAL CHARACTERS first, then some items/scenes
- Each idea should be a simple, drawable subject suitable for a coloring page
- Ideas should be characters, animals, objects, or scenes - NOT abstract concepts
- Each should be visually distinct from the others
- Keep names SHORT (1-4 words max)
- Mix character poses with action scenes and a few iconic items
${bookTheme ? `- REMEMBER: Every subject must be drawn in "${bookTheme}" style!` : '- Consider what the target audience would enjoy coloring'}

GOOD examples for "Marvel Superheroes" book: Spider-Man Swinging, Iron Man Flying, Hulk Smashing, Captain America, Thor with Hammer, Black Widow, Black Panther, Groot Dancing, Rocket Raccoon, Doctor Strange, Wolverine, Deadpool, Thanos, Avengers Team, Spider-Man vs Venom
BAD examples: "Spider-Man Mask", "Iron Man Helmet", "Thor's Hammer" (these are just items - suggest the actual heroes!)

GOOD examples for "Disney Princesses" book: Elsa with Magic, Moana Sailing, Rapunzel with Hair, Ariel Swimming, Belle Reading, Cinderella Dancing, Mulan with Sword, Tiana Cooking, Frozen Sisters, Princess Castle
BAD examples: "Glass Slipper", "Magic Mirror", "Crown" (suggest the princesses, not just objects!)

GOOD examples for an "Ocean Friends" book: Happy Dolphin, Smiling Starfish, Treasure Chest, Friendly Octopus, Sea Turtle, Coral Reef, Mermaid, Clownfish, Whale, Crab, Jellyfish, Seahorse, Submarine, Pirate Ship, Beach Scene

GOOD examples for "Cute Animals" book: Fluffy Bunny, Sleeping Kitten, Playful Puppy, Baby Elephant, Smiling Frog, Butterfly Garden, Owl at Night, Happy Penguin, Teddy Bear, Friendly Lion, Dancing Duck, Hedgehog, Panda Bear, Giraffe, Koala
BAD examples: "Animals", "Nature", "Pets" (too generic)

${bookTheme ? `GOOD examples for a book with theme "stained glass windows": Rose Window (stained glass style), Cross and Dove (stained glass style), Butterfly Window, Cathedral Scene, Angel Window, Peacock Panel - each subject rendered AS a stained glass design with geometric segments and bold outlines.` : ''}`;

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
              name: "generate_page_ideas",
              description: "Generate coloring page ideas for a book",
              parameters: {
                type: "object",
                properties: {
                  ideas: { 
                    type: "array", 
                    items: { type: "string" }, 
                    description: "15-20 SHORT names of drawable coloring page subjects" 
                  }
                },
                required: ["ideas"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_page_ideas" } }
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
    console.error("Error generating page ideas:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
