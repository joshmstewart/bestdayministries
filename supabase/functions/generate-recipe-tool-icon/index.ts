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
    const { toolId, toolName, category } = await req.json();

    if (!toolId || !toolName) {
      throw new Error("Missing toolId or toolName");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Generate a prompt for the kitchen tool icon
    const iconPrompt = `Create a perfectly square 1:1 aspect ratio icon of a ${toolName} (kitchen tool/equipment). Image must be exactly 256x256 pixels with equal width and height. Simple flat illustration style. Show the kitchen tool clearly and recognizably - include the complete tool as it would appear in a typical kitchen. Solid single-color background filling entire square canvas edge-to-edge.

CRITICAL FRAMING: The ${toolName} must fill 70-80% of the image frame - make it LARGE and prominent, not small and distant.
CRITICAL SHAPE: The image must have SHARP 90-DEGREE CORNERS - absolutely NO rounded corners, NO circular frames, NO curved edges. The card UI will handle any rounding.

No text, no gradients, minimal shadows. Make it clean and easily recognizable as a kitchen tool. Category: ${category}.`;

    console.log("Generating icon for recipe tool:", toolName);
    console.log("Prompt:", iconPrompt);

    // Call Lovable AI to generate the image
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: iconPrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limited by AI gateway");
        throw new Error("Rate limited - please wait and try again");
      }
      if (response.status === 402) {
        console.error("AI credits exhausted");
        throw new Error("AI credits exhausted - please add credits");
      }
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      throw new Error("No image generated");
    }

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to blob
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileName = `tools/${toolId}.png`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("recipe-images")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("recipe-images")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // Update the tool with the image URL
    const { error: updateError } = await supabase
      .from("recipe_tools")
      .update({ image_url: imageUrl })
      .eq("id", toolId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error(`Failed to update tool: ${updateError.message}`);
    }

    console.log("Successfully generated and saved icon for:", toolName);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        toolName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
