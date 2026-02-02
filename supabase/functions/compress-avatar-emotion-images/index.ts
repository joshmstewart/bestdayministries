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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with user's token to verify admin access
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["admin", "owner"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all avatar emotion images
    const { data: images, error: fetchError } = await supabaseAdmin
      .from("avatar_emotion_images")
      .select("id, avatar_id, emotion_type_id, image_url")
      .not("image_url", "is", null);

    if (fetchError) {
      throw new Error(`Failed to fetch images: ${fetchError.message}`);
    }

    if (!images || images.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No images to compress", processed: 0, failed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${images.length} avatar emotion images to compress`);

    let processed = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const image of images) {
      try {
        console.log(`Processing image ${image.id}: ${image.image_url}`);

        // Fetch the original image
        const imageResponse = await fetch(image.image_url);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }

        const originalBlob = await imageResponse.blob();
        const originalSize = originalBlob.size;

        console.log(`Original image size: ${originalSize} bytes`);

        // Skip if already small enough (under 100KB is likely already compressed)
        if (originalSize < 100 * 1024) {
          console.log(`Skipping already small image ${image.id} (${Math.round(originalSize / 1024)}KB)`);
          skipped++;
          continue;
        }

        // Skip if filename indicates already compressed
        if (image.image_url.includes("compressed-")) {
          console.log(`Skipping already compressed image ${image.id}`);
          skipped++;
          continue;
        }

        const originalBase64 = await blobToBase64(originalBlob);

        // Use AI Gateway to resize to 256x256
        const compressionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "GENERATE AN IMAGE NOW. Resize this image to exactly 256x256 pixels. Keep the same content exactly, just make it smaller. Output only the resized image, no text.",
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${originalBlob.type};base64,${originalBase64}`,
                    },
                  },
                ],
              },
            ],
            modalities: ["image", "text"],
          }),
        });

        if (!compressionResponse.ok) {
          const errorText = await compressionResponse.text();
          throw new Error(`AI Gateway error: ${compressionResponse.status} - ${errorText}`);
        }

        const compressedData = await compressionResponse.json();
        const compressedImageUrl = compressedData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!compressedImageUrl) {
          // AI didn't return an image, skip this one
          console.log(`AI didn't return image for ${image.id}, skipping`);
          failed++;
          errors.push(`${image.id}: AI returned no image`);
          continue;
        }

        // Convert compressed image to buffer
        const compressedBase64 = compressedImageUrl.replace(/^data:image\/\w+;base64,/, "");
        const compressedBuffer = Uint8Array.from(atob(compressedBase64), (c) => c.charCodeAt(0));
        const compressedSize = compressedBuffer.length;

        console.log(`Compressed size: ${compressedSize} bytes (${Math.round((1 - compressedSize/originalSize) * 100)}% reduction)`);

        // Extract filename from URL and create new path
        const urlParts = image.image_url.split("/");
        const originalFileName = urlParts[urlParts.length - 1];
        const newFileName = `compressed-${Date.now()}-${originalFileName}`;
        const filePath = `avatar-emotions/${newFileName}`;

        // Upload compressed image
        const { error: uploadError } = await supabaseAdmin.storage
          .from("app-assets")
          .upload(filePath, compressedBuffer, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from("app-assets")
          .getPublicUrl(filePath);

        const newPublicUrl = urlData.publicUrl;

        // Update database with new URL
        const { error: updateError } = await supabaseAdmin
          .from("avatar_emotion_images")
          .update({ image_url: newPublicUrl })
          .eq("id", image.id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        processed++;
        console.log(`Successfully compressed image ${image.id}`);

      } catch (error: any) {
        console.error(`Error processing image ${image.id}:`, error);
        failed++;
        errors.push(`${image.id}: ${error.message}`);
      }
    }

    console.log(`Compression complete: ${processed} processed, ${skipped} skipped (already compressed), ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Compressed ${processed} images, skipped ${skipped} already compressed`,
        processed,
        skipped,
        failed,
        total: images.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in compress-avatar-emotion-images:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to convert Blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
