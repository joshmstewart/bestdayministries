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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin access
    const { data: hasAccess } = await supabase.rpc("has_admin_access", {
      user_id: userData.user.id,
    });

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storeId, storeName, storeDescription } = await req.json();

    if (!storeId || !storeName) {
      return new Response(JSON.stringify({ error: "Store ID and name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate the image using Lovable AI image generation endpoint
    const prompt = `POV first person perspective from behind a ${storeName.toLowerCase()} checkout counter, looking out at the store interior. ${storeDescription || ""} Realistic photography style, wide angle lens, professional lighting. Ultra high resolution, 16:9 aspect ratio hero image. No text, no watermarks.`;

    console.log("Generating image with prompt:", prompt);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        prompt,
        n: 1,
        size: "1920x1080",
        response_format: "b64_json",
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      const short = (errorText || "").slice(0, 300);
      throw new Error(`AI API error: ${aiResponse.status}${short ? ` - ${short}` : ""}`);
    }

    const aiData = await aiResponse.json();
    const imageBase64 = aiData.data?.[0]?.b64_json;

    if (!imageBase64) {
      console.error("AI response:", JSON.stringify(aiData));
      throw new Error("No image generated");
    }

    // Convert base64 to buffer
    const imageBuffer = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));

    // Upload to storage
    const fileName = `store-${storeId}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("app-assets")
      .upload(`cash-register-stores/${fileName}`, imageBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("app-assets")
      .getPublicUrl(`cash-register-stores/${fileName}`);

    // Update the store record
    const { error: updateError } = await supabase
      .from("cash_register_stores")
      .update({ image_url: urlData.publicUrl })
      .eq("id", storeId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, imageUrl: urlData.publicUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
