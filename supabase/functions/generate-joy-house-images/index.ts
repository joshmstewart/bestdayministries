import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { locations } = await req.json();

    const results: { locationId: string; imageUrl: string; caption: string }[] = [];

    // Image prompts for each location
    const locationPrompts: Record<string, { prompts: { prompt: string; caption: string }[] }> = {
      "Joy House Downtown": {
        prompts: [
          { prompt: "Cozy downtown artisan gift shop storefront with large windows displaying handmade crafts, warm lighting, brick building, welcoming entrance with colorful seasonal decorations, professional photography style", caption: "Our welcoming Downtown storefront" },
          { prompt: "Interior of a charming gift shop with wooden shelves displaying handmade pottery, colorful textiles, and artisan crafts, warm ambient lighting, rustic modern decor", caption: "Browse our handcrafted collections" },
        ]
      },
      "Joy House Riverside": {
        prompts: [
          { prompt: "Quaint riverside boutique shop exterior with flower boxes, scenic river view in background, cottage-style architecture, sunny day, inviting storefront", caption: "Our scenic Riverside location" },
          { prompt: "Bright airy shop interior featuring handmade ceramics, garden accessories, potted plants, natural wood displays, large windows with natural light", caption: "Home goods and garden treasures" },
        ]
      },
      "Joy House Mountain View": {
        prompts: [
          { prompt: "Modern mountain town gift shop with large glass windows, mountain views, contemporary rustic exterior, outdoor seating area with coffee tables, warm inviting atmosphere", caption: "Welcome to our Mountain View store" },
          { prompt: "Modern cafe corner inside a gift shop with espresso machine, pastry display, cozy seating area, surrounded by artisan gifts and crafts on shelves", caption: "Relax in our cafe corner" },
        ]
      }
    };

    // Gallery images (not tied to specific location)
    const galleryPrompts = [
      { prompt: "Artisan workshop with adults with disabilities happily creating handmade crafts together, inclusive workplace, colorful materials, supportive environment, candid documentary style", caption: "Our talented artisans at work" },
      { prompt: "Display of beautiful handmade greeting cards, gift tags, and paper crafts arranged artistically, colorful designs, professional product photography", caption: "Handmade cards and paper crafts" },
      { prompt: "Collection of handwoven textiles, quilts, and fabric crafts displayed on wooden racks, warm colors, artisan quality, retail display", caption: "Cozy handwoven textiles" },
    ];

    // Generate images for each location
    for (const location of locations) {
      const prompts = locationPrompts[location.name]?.prompts || [];
      
      for (const { prompt, caption } of prompts) {
        try {
          console.log(`Generating image for ${location.name}: ${caption}`);
          
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image-preview",
              messages: [{ role: "user", content: prompt }],
              modalities: ["image", "text"],
            }),
          });

          if (!response.ok) {
            console.error(`Failed to generate image: ${response.status}`);
            continue;
          }

          const data = await response.json();
          const base64Image = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

          if (base64Image) {
            // Upload to Supabase Storage
            const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
            const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const fileName = `location-${location.id}-${Date.now()}.png`;

            const { error: uploadError } = await supabase.storage
              .from("joy-house-stores")
              .upload(fileName, imageBytes, {
                contentType: "image/png",
                upsert: true,
              });

            if (uploadError) {
              console.error("Upload error:", uploadError);
              continue;
            }

            const { data: urlData } = supabase.storage
              .from("joy-house-stores")
              .getPublicUrl(fileName);

            results.push({
              locationId: location.id,
              imageUrl: urlData.publicUrl,
              caption,
            });
          }
        } catch (error) {
          console.error(`Error generating image for ${location.name}:`, error);
        }
      }
    }

    // Generate gallery images
    for (const { prompt, caption } of galleryPrompts) {
      try {
        console.log(`Generating gallery image: ${caption}`);
        
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image-preview",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          console.error(`Failed to generate gallery image: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const base64Image = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (base64Image) {
          const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
          const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          const fileName = `gallery-${Date.now()}.png`;

          const { error: uploadError } = await supabase.storage
            .from("joy-house-stores")
            .upload(fileName, imageBytes, {
              contentType: "image/png",
              upsert: true,
            });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from("joy-house-stores")
            .getPublicUrl(fileName);

          results.push({
            locationId: "", // Gallery images have no location
            imageUrl: urlData.publicUrl,
            caption,
          });
        }
      } catch (error) {
        console.error(`Error generating gallery image:`, error);
      }
    }

    // Insert all images into database
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const insertData: Record<string, unknown> = {
        image_url: result.imageUrl,
        caption: result.caption,
        display_order: i + 1,
        is_hero: i === 0, // First image is hero
      };

      if (result.locationId) {
        insertData.location_id = result.locationId;
      }

      const { error: insertError } = await supabase
        .from("joy_house_store_images")
        .insert(insertData);

      if (insertError) {
        console.error("Insert error:", insertError);
      }
    }

    return new Response(JSON.stringify({ success: true, count: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
