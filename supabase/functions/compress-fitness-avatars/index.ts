import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Parse optional body
    let singleAvatarId: string | null = null;
    try {
      const body = await req.json();
      singleAvatarId = body.avatar_id || null;
    } catch {
      // No body
    }

    // Fetch avatars needing thumbnails
    let query = supabaseAdmin
      .from("fitness_avatars")
      .select("id, name, preview_image_url, thumbnail_sm_url, thumbnail_md_url")
      .not("preview_image_url", "is", null)
      .eq("is_active", true);

    if (singleAvatarId) {
      query = query.eq("id", singleAvatarId);
    }

    const { data: avatars, error: fetchError } = await query;
    if (fetchError) throw new Error(`Failed to fetch avatars: ${fetchError.message}`);

    const needsProcessing = (avatars || []).filter(
      a => !a.thumbnail_sm_url || !a.thumbnail_md_url
    );

    if (needsProcessing.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "All avatars already have thumbnails",
          total: avatars?.length || 0,
          processed: 0,
          skipped: avatars?.length || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ id: string; name: string; status: string; error?: string }> = [];
    const SIZES = [
      { key: "sm", size: 128, folder: "thumbnails-sm" },
      { key: "md", size: 256, folder: "thumbnails-md" },
    ] as const;

    // Process up to 5 per invocation to stay within edge function limits
    const batch = needsProcessing.slice(0, 5);

    for (const avatar of batch) {
      try {
        console.log(`Processing ${avatar.name} (${avatar.id})`);

        // Fetch original image
        const response = await fetch(avatar.preview_image_url!);
        if (!response.ok) {
          results.push({ id: avatar.id, name: avatar.name, status: "error", error: `Fetch failed: ${response.status}` });
          continue;
        }

        const originalBuffer = new Uint8Array(await response.arrayBuffer());
        const originalImage = await Image.decode(originalBuffer);

        const updateFields: Record<string, string> = {};

        for (const { key, size, folder } of SIZES) {
          const colName = `thumbnail_${key}_url`;
          // Skip if this size already exists
          if ((avatar as Record<string, unknown>)[colName]) continue;

          // Resize maintaining aspect ratio (fit to square)
          const resized = originalImage.clone().resize(size, size);
          const compressed = await resized.encode(3); // PNG compression level 3

          const fileName = `thumb-${key}-${avatar.id}-${Date.now()}.png`;
          const storagePath = `fitness-avatars/${folder}/${fileName}`;

          const { error: uploadError } = await supabaseAdmin.storage
            .from("app-assets")
            .upload(storagePath, compressed, {
              contentType: "image/png",
              upsert: true,
            });

          if (uploadError) {
            console.error(`Upload error for ${key}:`, uploadError);
            continue;
          }

          const { data: urlData } = supabaseAdmin.storage
            .from("app-assets")
            .getPublicUrl(storagePath);

          updateFields[colName] = urlData.publicUrl;
          console.log(`  ${key} thumbnail: ${size}px → ${compressed.length} bytes`);
        }

        if (Object.keys(updateFields).length > 0) {
          const { error: updateError } = await supabaseAdmin
            .from("fitness_avatars")
            .update(updateFields)
            .eq("id", avatar.id);

          if (updateError) {
            results.push({ id: avatar.id, name: avatar.name, status: "error", error: updateError.message });
          } else {
            results.push({ id: avatar.id, name: avatar.name, status: "success" });
          }
        } else {
          results.push({ id: avatar.id, name: avatar.name, status: "skipped" });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Error processing ${avatar.name}:`, msg);
        results.push({ id: avatar.id, name: avatar.name, status: "error", error: msg });
      }
    }

    const remaining = needsProcessing.length - batch.length;

    return new Response(
      JSON.stringify({
        success: true,
        total: avatars?.length || 0,
        processed: results.filter(r => r.status === "success").length,
        failed: results.filter(r => r.status === "error").length,
        remaining,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in compress-fitness-avatars:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
