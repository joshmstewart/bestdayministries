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
    const { data: adminCheck, error: adminError } = await supabase.rpc("has_admin_access", {
      _user_id: userData.user.id,
    });

    if (adminError) {
      console.error("Admin check error:", adminError);
      throw adminError;
    }

    if (!adminCheck) {
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

    // Generate the image using Lovable AI chat completions (Nano banana)
    // Photorealistic but FUN and EXCITING - not boring checkout counters!
    const prompt = `Photorealistic, high-quality photograph of an exciting ${storeName.toLowerCase()} interior. ${storeDescription || ""} The scene should be PACKED with interesting, fun details - real products, decorations, and activity that make it exciting to look at. Warm, inviting lighting with rich saturated colors. Show the unique character of this store with lots of visual interest - animals, creatures, colorful displays, interesting merchandise everywhere. Professional photography style, cinematic lighting, shallow depth of field. 16:9 aspect ratio. No text, no watermarks, no words. This should look like an amazing real place you'd WANT to visit, not a boring empty store!`;

    console.log("Generating image with prompt:", prompt);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      const short = (errorText || "").slice(0, 300);
      throw new Error(`AI API error: ${aiResponse.status}${short ? ` - ${short}` : ""}`);
    }

    const aiData = await aiResponse.json();

    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;

    if (!imageUrl || !imageUrl.startsWith("data:image")) {
      console.error("No image in AI response:", JSON.stringify(aiData));
      throw new Error("No image generated");
    }

    const base64Match = imageUrl.match(/^data:image\/\w+;base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Invalid image data format");
    }

    const imageBase64 = base64Match[1];

    // Convert base64 to buffer
    const imageBuffer = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));

    // Upload to storage
    const fileName = `store-${storeId}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("app-assets")
      .upload(`cash-register-stores/${fileName}`, imageBuffer, {
        contentType: "image/png",
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
