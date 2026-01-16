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

    // Get the authorization header to identify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Invalid user");
    }

    const { avatarId, activityName, imageType, workoutLogId } = await req.json();

    if (!avatarId || !imageType) {
      throw new Error("avatarId and imageType are required");
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

    // Verify user owns or has access to this avatar
    if (!avatar.is_free) {
      const { data: userAvatar, error: ownershipError } = await supabase
        .from("user_fitness_avatars")
        .select("id")
        .eq("user_id", user.id)
        .eq("avatar_id", avatarId)
        .single();

      if (ownershipError || !userAvatar) {
        throw new Error("You don't own this avatar");
      }
    }

    // Build the image generation prompt
    let prompt: string;
    
    if (imageType === "activity" && activityName) {
      prompt = `${avatar.character_prompt}, actively doing ${activityName} exercise, dynamic action pose, energetic and happy expression, colorful gym or outdoor workout background, high quality cartoon illustration, fun and motivational, 4K quality`;
    } else if (imageType === "celebration") {
      prompt = `${avatar.character_prompt}, celebrating with arms raised in victory, confetti and streamers in the air, trophy or medal visible, extremely happy and proud expression, colorful celebratory background with sparkles, high quality cartoon illustration, joyful and triumphant mood, 4K quality`;
    } else {
      throw new Error("Invalid imageType or missing activityName for activity type");
    }

    console.log("Generating image with prompt:", prompt);

    // Call Lovable AI to generate the image
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: prompt,
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
    const fileName = `${user.id}/${imageType}_${timestamp}.png`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("workout-images")
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
      .from("workout-images")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // Save to database
    const { data: savedImage, error: saveError } = await supabase
      .from("workout_generated_images")
      .insert({
        user_id: user.id,
        avatar_id: avatarId,
        workout_log_id: workoutLogId || null,
        image_url: imageUrl,
        image_type: imageType,
        activity_name: activityName || null,
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
