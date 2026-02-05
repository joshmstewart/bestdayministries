import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Common tools we can infer from recipe steps
const TOOL_PATTERNS: [RegExp, string][] = [
  [/\b(stove|burner|stovetop)\b/i, "Stove"],
  [/\b(oven|bake|roast|broil)\b/i, "Oven"],
  [/\b(pot|saucepan)\b/i, "Pot"],
  [/\b(pan|skillet|frying pan)\b/i, "Pan"],
  [/\b(microwave)\b/i, "Microwave"],
  [/\b(knife|chop|dice|mince|slice|cut)\b/i, "Knife"],
  [/\b(cutting board)\b/i, "Cutting Board"],
  [/\b(bowl|mixing bowl)\b/i, "Bowl"],
  [/\b(spoon|stir)\b/i, "Spoon"],
  [/\b(spatula|flip)\b/i, "Spatula"],
  [/\b(whisk)\b/i, "Whisk"],
  [/\b(measuring cup|measure)\b/i, "Measuring Cup"],
  [/\b(blender|blend)\b/i, "Blender"],
  [/\b(toaster|toast)\b/i, "Toaster"],
  [/\b(colander|strain|drain)\b/i, "Colander"],
  [/\b(baking sheet|cookie sheet|sheet pan)\b/i, "Baking Sheet"],
  [/\b(fork)\b/i, "Fork"],
  [/\b(lid|cover)\b/i, "Lid"],
  [/\b(plate)\b/i, "Plate"],
];

function inferToolsFromSteps(steps: string[]): string[] {
  const foundTools = new Set<string>();
  const stepsText = steps.join(" ");

  for (const [pattern, toolName] of TOOL_PATTERNS) {
    if (pattern.test(stepsText)) {
      foundTools.add(toolName);
    }
  }

  return Array.from(foundTools);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all public recipes with empty or null tools
    const { data: recipes, error: fetchError } = await supabase
      .from("public_recipes")
      .select("id, title, steps, tools")
      .or("tools.is.null,tools.eq.{}");

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${recipes?.length || 0} recipes to backfill`);

    const results: { id: string; title: string; tools: string[] }[] = [];

    for (const recipe of recipes || []) {
      const inferredTools = inferToolsFromSteps(recipe.steps || []);

      if (inferredTools.length > 0) {
        const { error: updateError } = await supabase
          .from("public_recipes")
          .update({ tools: inferredTools })
          .eq("id", recipe.id);

        if (updateError) {
          console.error(`Error updating ${recipe.id}:`, updateError);
        } else {
          results.push({ id: recipe.id, title: recipe.title, tools: inferredTools });
          console.log(`Updated "${recipe.title}" with tools: ${inferredTools.join(", ")}`);
        }
      }
    }

    // Also backfill saved_recipes that have empty tools
    const { data: savedRecipes, error: savedFetchError } = await supabase
      .from("saved_recipes")
      .select("id, title, steps, tools")
      .or("tools.is.null,tools.eq.{}");

    if (savedFetchError) {
      console.error("Error fetching saved_recipes:", savedFetchError);
    } else {
      for (const recipe of savedRecipes || []) {
        const inferredTools = inferToolsFromSteps(recipe.steps || []);

        if (inferredTools.length > 0) {
          const { error: updateError } = await supabase
            .from("saved_recipes")
            .update({ tools: inferredTools })
            .eq("id", recipe.id);

          if (updateError) {
            console.error(`Error updating saved_recipe ${recipe.id}:`, updateError);
          } else {
            console.log(`Updated saved_recipe "${recipe.title}" with tools: ${inferredTools.join(", ")}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfilled tools for ${results.length} public recipes`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in backfill-recipe-tools:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
