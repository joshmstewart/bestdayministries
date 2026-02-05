import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch drinks without descriptions
    const { data: drinks, error: fetchError } = await supabase
      .from("custom_drinks")
      .select("id, name, ingredients")
      .is("description", null)
      .limit(20);

    if (fetchError) throw fetchError;
    if (!drinks || drinks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No drinks need descriptions", updated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all ingredient names at once
    const allIngredientIds = [...new Set(drinks.flatMap((d) => d.ingredients || []))];
    const { data: ingredientData } = await supabase
      .from("drink_ingredients")
      .select("id, name")
      .in("id", allIngredientIds);

    const ingredientMap = new Map(ingredientData?.map((i) => [i.id, i.name]) || []);

    let updatedCount = 0;
    const errors: string[] = [];

    for (const drink of drinks) {
      try {
        const ingredientNames = (drink.ingredients || [])
          .map((id: string) => ingredientMap.get(id))
          .filter(Boolean);

        if (ingredientNames.length === 0) continue;

        const ingredientList = ingredientNames.join(", ");
        const prompt = `Write a short, fun, and appealing 1-2 sentence description for a custom drink called "${drink.name}". 
The drink contains: ${ingredientList}.
Make it sound delicious and inviting. Be creative but concise. Do not use quotes around the description.`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are a creative barista who writes enticing drink descriptions. Keep responses short and fun.",
              },
              { role: "user", content: prompt },
            ],
            max_tokens: 100,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`AI API error for ${drink.name}:`, errorText);
          errors.push(`Failed to generate for ${drink.name}`);
          continue;
        }

        const data = await response.json();
        const description = data.choices?.[0]?.message?.content?.trim();

        if (description) {
          const { error: updateError } = await supabase
            .from("custom_drinks")
            .update({ description })
            .eq("id", drink.id);

          if (updateError) {
            errors.push(`Failed to update ${drink.name}: ${updateError.message}`);
          } else {
            updatedCount++;
            console.log(`Updated description for: ${drink.name}`);
          }
        }

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 500));
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`Error processing ${drink.name}:`, err);
        errors.push(`Error for ${drink.name}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Backfill complete`,
        updated: updatedCount,
        total: drinks.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
