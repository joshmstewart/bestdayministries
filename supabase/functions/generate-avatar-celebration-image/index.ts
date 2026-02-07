import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { translateCharacterName } from "../_shared/character-name-translator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
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
        "pumping fists in the air celebrating a big win, shiny golden trophy visible",
        "cheering with both hands up, colorful balloons and streamers in the background",
        "striking a triumphant victory pose with golden light rays behind them",
      ],
    };

    const prompts = celebrationPrompts[celebrationType] || celebrationPrompts.game_win;

    // Check for character-specific enhancements
    const isBubbleBenny = avatar.name?.toLowerCase().includes("bubble benny");
    const isXeroxXander = avatar.name?.toLowerCase().includes("xerox xander");
    
    let characterEnhancements = "";
    if (isBubbleBenny) {
      characterEnhancements = " CRITICAL: This character is 'Bubble Benny' - they MUST have iridescent soap bubbles floating all around them and soap-bubble texture on their skin. They should also be holding a bubble wand and blowing a big celebratory soap bubble.";
    } else if (isXeroxXander) {
      characterEnhancements = " CRITICAL: This character is 'Xerox Xander' whose superpower is that he copied/duplicated himself. You MUST show TWO IDENTICAL versions of this character side by side celebrating together. Both copies should look exactly the same and be doing the same celebration pose or mirrored poses. Show the twins high-fiving, jumping together, or doing synchronized celebration moves.";
    }

    // Build sex/anatomical consistency constraint
    let sexConstraint = "";
    if (avatar.sex === "male") {
      sexConstraint = " CRITICAL ANATOMICAL CONSISTENCY: This character is MALE. The body MUST have a masculine build - muscular pecs are fine but NO breasts or feminine breast-like shapes. Use masculine torso proportions and an appropriate male physique including a visible bulge in the crotch area. Do NOT give this character any feminine body characteristics.";
    } else if (avatar.sex === "female") {
      sexConstraint = " CRITICAL ANATOMICAL CONSISTENCY: This character is FEMALE. The body should have a feminine build with appropriate female proportions. Maintain feminine body characteristics consistently.";
    } else if (avatar.sex === "androgynous") {
      sexConstraint = " CRITICAL ANATOMICAL CONSISTENCY: This character is ANDROGYNOUS. The body should have a neutral, gender-ambiguous build - neither distinctly masculine nor feminine. Use slender proportions, a flat or very subtle chest, and avoid strongly gendered body characteristics.";
    }

    console.log("Generating celebration image for avatar:", avatar.name);

    // --- Retry with reference image, then fall back to text-only ---
    const MAX_ATTEMPTS = 3;
    let imageData: string | null = null;
    let usedTextFallback = false;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const isLastAttempt = attempt === MAX_ATTEMPTS;
      const useTextOnly = isLastAttempt;
      
      // Pick a different random prompt on each attempt
      const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

      let messageContent: any;

      if (useTextOnly) {
        // Text-only fallback using translateCharacterName for copyrighted characters
        const translation = translateCharacterName(avatar.name || '', avatar.character_prompt);
        const characterDesc = translation.translatedPrompt || avatar.character_prompt || avatar.name;
        
        console.log(`Attempt ${attempt}: TEXT-ONLY fallback (translated: ${translation.wasTranslated})`);
        
        messageContent = `Generate a celebration image of ${characterDesc} ${randomPrompt}. Keep the character's thematic identity/costume style exactly as described.${sexConstraint}${characterEnhancements}

CRITICAL COSTUME RULE: Do NOT add a cape, cloak, shawl, or any back-draped/flowing fabric unless it is part of the character's signature look.

The image should be joyful and celebratory, suitable for a game victory screen. High quality cartoon illustration, vibrant colors, energetic composition. IMPORTANT: Do NOT include any text, words, letters, numbers, or written language anywhere in the image - purely visual celebration only.`;
        usedTextFallback = true;
      } else {
        // Reference image attempt
        console.log(`Attempt ${attempt}: Using reference image`);
        
        messageContent = [
          {
            type: "text",
            text: `Create a celebration image showing the EXACT same character from the reference image ${randomPrompt}. Keep the character COMPLETELY identical - same gender, face, hair, body shape, outfit details, accessories, and art style, preserving their thematic identity/costume style exactly as shown in the reference.${sexConstraint}${characterEnhancements}

CRITICAL COSTUME RULE: Do NOT add a cape, cloak, shawl, or any back-draped/flowing fabric unless it is clearly present on the character in the reference image. If the reference image does NOT have a cape/cloak, then the generated image must NOT include one.

The image should be joyful and celebratory, suitable for a game victory screen. High quality cartoon illustration, vibrant colors, energetic composition. IMPORTANT: Do NOT include any text, words, letters, numbers, or written language anywhere in the image - purely visual celebration only.`,
          },
          { type: "image_url", image_url: { url: avatarImageUrl } },
        ];
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: messageContent }],
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
        console.error(`AI API error (attempt ${attempt}):`, response.status, errorText);
        if (isLastAttempt) throw new Error("Failed to generate image");
        continue;
      }

      const aiResponse = await response.json();
      imageData = aiResponse.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (imageData) {
        console.log(`Successfully generated image on attempt ${attempt}${useTextOnly ? ' (text-only fallback)' : ' (reference image)'}`);
        break;
      }

      const finishReason = aiResponse.choices?.[0]?.native_finish_reason || aiResponse.choices?.[0]?.finish_reason;
      console.warn(`No image on attempt ${attempt}, finish_reason: ${finishReason}`);
      
      if (isLastAttempt) {
        console.error("All attempts exhausted. Last response:", JSON.stringify(aiResponse));
      }
    }

    if (!imageData) {
      throw new Error("Image generation blocked by content filter after all attempts. Try a different avatar.");
    }

    // Extract base64 data
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const timestamp = Date.now();
    const fileName = `${avatarId}/celebration_${celebrationType}_${timestamp}.png`;

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

    const { data: urlData } = supabase.storage
      .from("avatar-celebration-images")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    const { data: existing } = await supabase
      .from("fitness_avatar_celebration_images")
      .select("display_order")
      .eq("avatar_id", avatarId)
      .order("display_order", { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

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
      JSON.stringify({ success: true, image: savedImage, usedTextFallback }),
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
