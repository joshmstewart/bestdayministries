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
    const { imageUrl, customerId } = await req.json();

    if (!imageUrl) {
      throw new Error("Image URL is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Removing background from image:", imageUrl.substring(0, 100));

    // Use the image generation model to recreate the character on a transparent background
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
            content: [
              {
                type: "text",
                text: `Look at this image of a person/character. Create a NEW image that shows ONLY the person/character with NO background at all - just the person floating on a completely transparent/empty background. The person should be a clean cutout with no scenery, no floor, no walls, no objects behind them. Make the background 100% transparent (PNG with alpha channel). Keep the person exactly as they appear but remove ALL background elements.`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received, checking for image...");
    
    const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!editedImageUrl) {
      console.error("No image in response:", JSON.stringify(data).substring(0, 500));
      throw new Error("No image generated");
    }

    // If it's a base64 image, upload it to storage
    if (editedImageUrl.startsWith("data:image")) {
      console.log("Got base64 image, uploading to storage...");
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Extract base64 data
      const base64Match = editedImageUrl.match(/^data:image\/\w+;base64,(.+)$/);
      if (!base64Match) {
        throw new Error("Invalid base64 image format");
      }

      const imageBase64 = base64Match[1];
      const imageBuffer = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));

      const fileId = customerId || `temp-${Date.now()}`;
      const fileName = `customer-nobg-${fileId}-${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from("app-assets")
        .upload(`cash-register-customers/${fileName}`, imageBuffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("app-assets")
        .getPublicUrl(`cash-register-customers/${fileName}`);

      console.log("Image uploaded successfully:", urlData.publicUrl);

      return new Response(
        JSON.stringify({ imageUrl: urlData.publicUrl }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If not base64, return the URL directly
    return new Response(
      JSON.stringify({ imageUrl: editedImageUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error removing background:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
