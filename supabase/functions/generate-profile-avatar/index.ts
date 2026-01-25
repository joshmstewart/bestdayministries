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

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Invalid user");
    }

    const { sceneDescription } = await req.json();

    if (!sceneDescription) {
      throw new Error("sceneDescription is required");
    }

    // Get user's selected fitness avatar
    const { data: userAvatar, error: avatarError } = await supabase
      .from("user_fitness_avatars")
      .select("avatar_id, fitness_avatars(*)")
      .eq("user_id", user.id)
      .eq("is_selected", true)
      .single();

    if (avatarError || !userAvatar?.fitness_avatars) {
      throw new Error("No fitness avatar selected. Please select an avatar in the Fitness Center first.");
    }

    const avatar = userAvatar.fitness_avatars as any;
    const avatarImageUrl = avatar.image_url || avatar.preview_image_url;

    if (!avatarImageUrl) {
      throw new Error("Avatar has no image to use");
    }

    // Build sex/anatomical consistency constraint if defined
    let sexConstraint = "";
    if (avatar.sex === "male") {
      sexConstraint = " CRITICAL ANATOMICAL CONSISTENCY: This character is MALE. The body MUST have a masculine build with a flat chest (NO breasts or breast-like shapes), masculine torso proportions, and an appropriate male physique. Do NOT give this character any feminine body characteristics.";
    } else if (avatar.sex === "female") {
      sexConstraint = " CRITICAL ANATOMICAL CONSISTENCY: This character is FEMALE. The body should have a feminine build with appropriate female proportions. Maintain feminine body characteristics consistently.";
    } else if (avatar.sex === "androgynous") {
      sexConstraint = " CRITICAL ANATOMICAL CONSISTENCY: This character is ANDROGYNOUS. The body should have a neutral, gender-ambiguous build - neither distinctly masculine nor feminine. Use slender proportions, a flat or very subtle chest, and avoid strongly gendered body characteristics.";
    }

    // Build the prompt for a profile-worthy image that preserves character identity
    const prompt = `Use the EXACT same character from the reference image. Create a profile picture/avatar showing them ${sceneDescription}. Keep the character COMPLETELY identical - same gender, face, hair, art style, AND their thematic identity/costume style (e.g., if they're a mage preserve their mystical/wizard aesthetic, if a superhero keep their heroic look, if fantasy-themed preserve those elements - adapt the outfit for the scene but keep the signature style/vibe).${sexConstraint} The image should be suitable as a profile picture - centered on the character with a simple, complementary background. High quality cartoon illustration, vibrant colors, friendly expression.`;

    console.log("Generating profile avatar with scene:", sceneDescription);
    console.log("Avatar image URL:", avatarImageUrl);

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
    const fileName = `${user.id}/profile_${timestamp}.png`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("profile-avatars")
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
      .from("profile-avatars")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: imageUrl,
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
