import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fuzzy matching helper - finds best match from a list
function findBestMatch(item: string, options: string[]): { match: string | null; score: number } {
  const normalizedItem = item.toLowerCase().trim();
  
  // Direct match
  const directMatch = options.find(opt => opt.toLowerCase() === normalizedItem);
  if (directMatch) return { match: directMatch, score: 1 };
  
  // Contains match (e.g., "cheddar cheese" -> "Cheese")
  for (const opt of options) {
    const normalizedOpt = opt.toLowerCase();
    if (normalizedItem.includes(normalizedOpt) || normalizedOpt.includes(normalizedItem)) {
      return { match: opt, score: 0.8 };
    }
  }
  
  // Word overlap match
  const itemWords = normalizedItem.split(/\s+/);
  let bestMatch: string | null = null;
  let bestScore = 0;
  
  for (const opt of options) {
    const optWords = opt.toLowerCase().split(/\s+/);
    const commonWords = itemWords.filter(w => optWords.some(ow => ow.includes(w) || w.includes(ow)));
    const score = commonWords.length / Math.max(itemWords.length, optWords.length);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = opt;
    }
  }
  
  return { match: bestMatch, score: bestScore };
}

// Extract base ingredient name (remove quantities, units, descriptions)
function extractIngredientName(ingredient: string): string {
  // Remove quantities and units
  let name = ingredient
    .replace(/^\d+[\s\/\d]*\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lb|lbs?|pounds?|g|grams?|kg|ml|liters?|pieces?|slices?|cloves?|heads?|bunches?|cans?|jars?|packages?|bags?|boxes?)?\s*/i, '')
    .trim();
  
  // Remove common descriptors
  name = name
    .replace(/\b(fresh|frozen|canned|dried|chopped|diced|sliced|minced|grated|shredded|large|small|medium|whole|half|optional|to taste|for garnish|room temperature|cold|warm|hot)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove parenthetical notes
  name = name.replace(/\([^)]*\)/g, '').trim();
  
  return name;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipeText } = await req.json();

    if (!recipeText || recipeText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipe text provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client for fetching wizard items
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch wizard ingredients and tools for matching
    const [ingredientsResult, toolsResult] = await Promise.all([
      supabase.from("recipe_ingredients").select("name").eq("is_active", true),
      supabase.from("recipe_tools").select("name").eq("is_active", true),
    ]);

    const wizardIngredients = (ingredientsResult.data || []).map(i => i.name);
    const wizardTools = (toolsResult.data || []).map(t => t.name);

    const systemPrompt = `You are a helpful cooking assistant that specializes in adapting recipes for adults with intellectual disabilities.

Your job is to:
1. Parse the provided recipe text into a structured format
2. Simplify complex steps into shorter, clearer instructions
3. Identify any safety concerns and list them
4. Suggest improvements for accessibility, safety, or simplicity

IMPORTANT: These are ADULTS, not children. Do NOT say "ask a grown-up" or treat them like children.
Instead, include safety notes for tasks that might need extra care or help from a support person.

You MUST respond with a JSON object in this exact format:
{
  "title": "Recipe Title",
  "description": "A friendly 1-2 sentence description of the dish",
  "ingredients": ["ingredient 1 with amount", "ingredient 2 with amount", ...],
  "tools": ["Tool 1", "Tool 2", ...],
  "steps": [
    "Step 1 in simple, clear words",
    "Step 2 in simple, clear words",
    ...
  ],
  "tips": [
    "A helpful tip",
    "Another helpful tip"
  ],
  "safetyNotes": ["Using sharp knife", "Hot stove", "Hot oven"],
  "suggestions": [
    {
      "type": "safety" | "simplification" | "substitution" | "tip",
      "original": "What was in the original recipe (if applicable)",
      "suggested": "Your suggested improvement",
      "reason": "Why this change helps"
    }
  ]
}

Guidelines for parsing:
- Keep steps to 8-10 maximum. Each step should be ONE simple action.
- Use simple words, avoid cooking jargon
- If a step is complex, break it into multiple simpler steps
- List ALL kitchen tools needed (knife, cutting board, pan, pot, oven, microwave, mixing bowl, spoon, etc.)
- For safety notes, include things like: using sharp knife, hot stove, boiling water, hot oven
- For suggestions, focus on:
  * Safety: hazards that could be avoided or need support
  * Simplification: steps that could be made easier
  * Substitution: easier alternatives to complex techniques
  * Tips: helpful additions for success

Only return the JSON, no other text.`;

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
          { role: "user", content: `Please parse and adapt this recipe:\n\n${recipeText}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to parse recipe");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    let parsedRecipe;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedRecipe = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse recipe structure. Please try again.");
    }

    // Match ingredients and tools with wizard items
    const matchedIngredients: string[] = [];
    const unmatchedIngredients: string[] = [];
    const matchedTools: string[] = [];
    const unmatchedTools: string[] = [];

    // Process ingredients
    for (const ingredient of parsedRecipe.ingredients || []) {
      const baseName = extractIngredientName(ingredient);
      const { match } = findBestMatch(baseName, wizardIngredients);
      
      if (match) {
        if (!matchedIngredients.includes(match)) {
          matchedIngredients.push(match);
        }
      } else {
        unmatchedIngredients.push(baseName || ingredient);
      }
    }

    // Process tools
    for (const tool of parsedRecipe.tools || []) {
      const { match } = findBestMatch(tool, wizardTools);
      
      if (match) {
        if (!matchedTools.includes(match)) {
          matchedTools.push(match);
        }
      } else {
        unmatchedTools.push(tool);
      }
    }

    // Log unmatched items to database for admin tracking
    const unmatchedItemsToLog: { item_name: string; item_type: string }[] = [];
    
    for (const item of unmatchedIngredients) {
      if (item.length > 1) { // Skip very short items
        unmatchedItemsToLog.push({ item_name: item, item_type: 'ingredient' });
      }
    }
    
    for (const item of unmatchedTools) {
      if (item.length > 1) {
        unmatchedItemsToLog.push({ item_name: item, item_type: 'tool' });
      }
    }

    // Upsert unmatched items (increment count if exists)
    for (const item of unmatchedItemsToLog) {
      const { data: existing } = await supabase
        .from("recipe_unmatched_items")
        .select("id, occurrence_count")
        .eq("item_name", item.item_name)
        .eq("item_type", item.item_type)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("recipe_unmatched_items")
          .update({ 
            occurrence_count: existing.occurrence_count + 1,
            last_seen_at: new Date().toISOString()
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("recipe_unmatched_items")
          .insert(item);
      }
    }

    // Update the recipe with matched items and add notes about unmatched
    parsedRecipe.matchedIngredients = matchedIngredients;
    parsedRecipe.matchedTools = matchedTools;
    parsedRecipe.unmatchedIngredients = unmatchedIngredients;
    parsedRecipe.unmatchedTools = unmatchedTools;
    
    // Keep original ingredients and tools arrays for display, but mark which are matched
    parsedRecipe.ingredientMatches = (parsedRecipe.ingredients || []).map((ing: string) => {
      const baseName = extractIngredientName(ing);
      const { match } = findBestMatch(baseName, wizardIngredients);
      return { original: ing, matched: match };
    });
    
    parsedRecipe.toolMatches = (parsedRecipe.tools || []).map((tool: string) => {
      const { match } = findBestMatch(tool, wizardTools);
      return { original: tool, matched: match };
    });

    // Generate an image for the recipe
    console.log("Generating image for parsed recipe:", parsedRecipe.title);
    
    const ingredientList = parsedRecipe.ingredients?.length > 0 
      ? parsedRecipe.ingredients.map((i: string) => i.replace(/^\d+[\s\/\d]*\s*(cups?|tbsp|tsp|oz|lb|g|ml|pieces?|slices?)?\s*/i, '').trim()).join(", ")
      : parsedRecipe.title;
    
    const imagePrompt = `Generate a photo of ${parsedRecipe.title} that looks homemade and delicious.
The dish contains: ${ingredientList}.
Food photography style with soft natural lighting.
The food is plated nicely on a simple plate or bowl.
Cozy kitchen background, slightly blurred.
Homemade, warm, and inviting appearance.`;

    try {
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            { role: "user", content: imagePrompt }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (imageUrl) {
          parsedRecipe.imageUrl = imageUrl;
          console.log("Image generated successfully");
        }
      } else {
        console.log("Image generation failed, continuing without image");
      }
    } catch (imageError) {
      console.error("Error generating image:", imageError);
    }

    console.log("Recipe parsed successfully:", parsedRecipe.title);
    console.log("Matched ingredients:", matchedIngredients.length, "Unmatched:", unmatchedIngredients.length);
    console.log("Matched tools:", matchedTools.length, "Unmatched:", unmatchedTools.length);

    return new Response(
      JSON.stringify({ recipe: parsedRecipe }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error parsing recipe:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
