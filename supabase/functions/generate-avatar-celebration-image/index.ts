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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    // Verify admin access
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Invalid user");
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleData || (roleData.role !== "admin" && roleData.role !== "owner")) {
      throw new Error("Admin access required");
    }

    const { avatarId, celebrationType = "game_win" } = await req.json();

    if (!avatarId) {
      throw new Error("avatarId is required");
    }

    // Get the avatar details
    const { data: avatar, error: avatarError } = await supabase
      .from("fitness_avatars")
      .select("*")
      .eq("id", avatarId)
      .single();

    if (avatarError || !avatar) {
      throw new Error("Avatar not found");
    }

    const avatarImageUrl = avatar.image_url || avatar.preview_image_url;
    if (!avatarImageUrl) {
      throw new Error("Avatar has no image to use as reference");
    }

    // Build celebration prompts based on type
    const celebrationPrompts: Record<string, string[]> = {
      game_win: [
        "jumping in the air with arms raised in victory celebration, confetti falling around them",
        "doing a happy victory dance with big smile, sparkles and stars around them",
        "pumping fists in the air celebrating a big win, trophy or medal visible",
        "cheering with both hands up, balloons and streamers in the background",
        "striking a triumphant superhero pose with cape flowing, golden light behind them",
      ],
    };

    const prompts = celebrationPrompts[celebrationType] || celebrationPrompts.game_win;
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

    const prompt = `Create a celebration image showing the EXACT same character from the reference image ${randomPrompt}. Keep the character COMPLETELY identical - same gender, face, hair, art style, AND their thematic identity/costume style. The image should be joyful and celebratory, suitable for a game victory screen. High quality cartoon illustration, vibrant colors, energetic composition.`;

    console.log("Generating celebration image for avatar:", avatar.name);
    console.log("Using prompt:", prompt);

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
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: avatarImageUrl } }
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error("Failed to generate image");
    }

    const aiResponse = await response.json();
    const imageData = aiResponse.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in AI response:", JSON.stringify(aiResponse));
      throw new Error("No image generated");
    }

    // Extract base64 data
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${avatarId}/celebration_${celebrationType}_${timestamp}.png`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("avatar-celebration-images")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to save image");
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("avatar-celebration-images")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // Get current max display_order for this avatar
    const { data: existing } = await supabase
      .from("fitness_avatar_celebration_images")
      .select("display_order")
      .eq("avatar_id", avatarId)
      .order("display_order", { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

    // Save to database
    const { data: savedImage, error: saveError } = await supabase
      .from("fitness_avatar_celebration_images")
      .insert({
        avatar_id: avatarId,
        image_url: imageUrl,
        celebration_type: celebrationType,
        display_order: nextOrder,
        is_active: true,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
      throw new Error("Failed to save image record");
    }

    return new Response(
      JSON.stringify({
        success: true,
        image: savedImage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
