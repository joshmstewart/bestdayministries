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
    const { bookTitle, bookDescription } = await req.json();
    
    if (!bookTitle) {
      throw new Error("Book title is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating coloring page ideas for: ${bookTitle}`);

    const systemPrompt = "You are a creative designer for children's coloring books. You suggest simple, appealing subjects that work well as coloring pages with clear outlines.";
    
    const userPrompt = `Generate 15-20 coloring page ideas for a coloring book titled "${bookTitle}"${bookDescription ? `. The book is about: ${bookDescription}` : ''}.

REQUIREMENTS:
- Each idea should be a simple, drawable subject suitable for a coloring page
- Ideas should be concrete objects, animals, scenes, or characters - NOT abstract concepts
- Each should be visually distinct from the others
- Keep names SHORT (1-4 words max)
- Mix simple subjects with slightly more detailed ones
- Consider what children would enjoy coloring

GOOD examples for an "Ocean Friends" book: Happy Dolphin, Smiling Starfish, Treasure Chest, Friendly Octopus, Sea Turtle, Coral Reef, Mermaid, Clownfish, Whale, Crab, Jellyfish, Seahorse, Submarine, Pirate Ship, Beach Scene
BAD examples: "The Ocean", "Marine Biology", "Water" (too abstract or vague)

GOOD examples for "Cute Animals" book: Fluffy Bunny, Sleeping Kitten, Playful Puppy, Baby Elephant, Smiling Frog, Butterfly Garden, Owl at Night, Happy Penguin, Teddy Bear, Friendly Lion, Dancing Duck, Hedgehog, Panda Bear, Giraffe, Koala
BAD examples: "Animals", "Nature", "Pets" (too generic)`;

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
