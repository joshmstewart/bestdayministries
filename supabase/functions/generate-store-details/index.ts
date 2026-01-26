import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeId, storeName, storeDescription } = await req.json();

    if (!storeId || !storeName) {
      throw new Error("storeId and storeName are required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate menu items and receipt details using AI
    const prompt = `You are helping create a realistic cash register game for practice.

For a store called "${storeName}"${storeDescription ? ` (${storeDescription})` : ""}, generate:

1. A list of exactly 45 menu/product items that would realistically be sold at this store. Include a wide variety of items across different categories (e.g., drinks, snacks, meals, desserts, sides, specials). For each item, provide a name and a realistic price range (min and max in USD).

2. A fictional street address for the receipt header (e.g., "456 Oak Avenue").

3. A short, fun tagline for the receipt (e.g., "Fresh foods, great prices!").

Respond ONLY with valid JSON in this exact format, no other text:
{
  "menuItems": [
    {"name": "Item Name", "priceRange": [1.99, 4.99]},
    ...
  ],
  "receiptAddress": "123 Street Name",
  "receiptTagline": "Your tagline here!"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the JSON response
    let parsed;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    const { menuItems, receiptAddress, receiptTagline } = parsed;

    // Update the store with generated details
    const { error: updateError } = await supabase
      .from("cash_register_stores")
      .update({
        menu_items: menuItems,
        receipt_address: receiptAddress || "123 Main Street",
        receipt_tagline: receiptTagline || "Thank you for your order!",
      })
      .eq("id", storeId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        menuItems,
        receiptAddress,
        receiptTagline
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
