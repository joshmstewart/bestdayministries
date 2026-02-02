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

    // Parse request body for optional job_id (to resume) or batch_size
    let jobId: string | null = null;
    let batchSize = 5; // Process 5 at a time for progress visibility
    
    try {
      const body = await req.json();
      jobId = body.job_id || null;
      batchSize = body.batch_size || 5;
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Check for existing running job
    if (!jobId) {
      const { data: existingJob } = await supabaseAdmin
        .from("avatar_compression_jobs")
        .select("*")
        .eq("status", "running")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingJob) {
        jobId = existingJob.id;
      }
    }

    // Get all images that need compression (not already compressed)
    const { data: allImages, error: fetchError } = await supabaseAdmin
      .from("avatar_emotion_images")
      .select("id, avatar_id, emotion_type_id, image_url")
      .not("image_url", "is", null);

    if (fetchError) {
      throw new Error(`Failed to fetch images: ${fetchError.message}`);
    }

    // Filter to only uncompressed images
    const imagesToProcess = (allImages || []).filter(
      img => img.image_url && !img.image_url.includes("compressed-")
    );
    const alreadyCompressed = (allImages || []).length - imagesToProcess.length;

    // Create or resume job
    let job: any;
    if (jobId) {
      const { data: existingJob, error: jobError } = await supabaseAdmin
        .from("avatar_compression_jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (jobError || !existingJob) {
        throw new Error("Job not found");
      }
      job = existingJob;
    } else {
      // Create new job
      const { data: newJob, error: createError } = await supabaseAdmin
        .from("avatar_compression_jobs")
        .insert({
          status: "running",
          total_images: imagesToProcess.length,
          already_compressed: alreadyCompressed,
          processed: 0,
          failed: 0,
          skipped: 0,
          started_at: new Date().toISOString(),
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create job: ${createError.message}`);
      }
      job = newJob;
    }

    // If no images to process, complete immediately
    if (imagesToProcess.length === 0) {
      await supabaseAdmin
        .from("avatar_compression_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      return new Response(
        JSON.stringify({
          success: true,
          job_id: job.id,
          status: "completed",
          message: "No images need compression",
          total: allImages?.length || 0,
          already_compressed: alreadyCompressed,
          processed: 0,
          failed: 0,
          skipped: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process a batch of images
    let processed = job.processed || 0;
    let failed = job.failed || 0;
    let skipped = job.skipped || 0;
    const errors: string[] = [...(job.error_messages || [])];
    
    // Skip already processed images
    const startIndex = processed + failed + skipped;
    const batch = imagesToProcess.slice(startIndex, startIndex + batchSize);

    for (const image of batch) {
      try {
        // Update current image being processed
        await supabaseAdmin
          .from("avatar_compression_jobs")
          .update({ current_image_id: image.id })
          .eq("id", job.id);

        console.log(`Processing image ${image.id}: ${image.image_url}`);

        // Fetch the original image
        const imageResponse = await fetch(image.image_url);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }

        const originalBlob = await imageResponse.blob();
        const originalSize = originalBlob.size;

        console.log(`Original image size: ${originalSize} bytes`);

        // Skip if already small enough (under 100KB is likely already optimized)
        if (originalSize < 100 * 1024) {
          console.log(`Skipping already small image ${image.id} (${Math.round(originalSize / 1024)}KB)`);
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

    // Update job progress
    const totalProcessed = processed + failed + skipped;
    const isComplete = totalProcessed >= imagesToProcess.length;
    
    await supabaseAdmin
      .from("avatar_compression_jobs")
      .update({
        processed,
        failed,
        skipped,
        error_messages: errors,
        status: isComplete ? "completed" : "running",
        completed_at: isComplete ? new Date().toISOString() : null,
        current_image_id: null,
      })
      .eq("id", job.id);

    console.log(`Batch complete: ${processed} processed, ${skipped} skipped, ${failed} failed. ${isComplete ? 'Job complete!' : 'More batches needed.'}`);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        status: isComplete ? "completed" : "running",
        total: imagesToProcess.length,
        already_compressed: alreadyCompressed,
        processed,
        skipped,
        failed,
        remaining: imagesToProcess.length - totalProcessed,
        errors: errors.length > 0 ? errors : undefined,
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
