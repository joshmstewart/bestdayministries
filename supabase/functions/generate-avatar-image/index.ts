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
    const { avatarId, characterPrompt, name, characterType } = await req.json();

    if (!avatarId || !characterPrompt) {
      return new Response(
        JSON.stringify({ error: "avatarId and characterPrompt are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAnimalCharacter = characterType === 'animal';

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["admin", "owner"].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating avatar image for: ${name}`);

    // --- Diversity enforcement ---
    // The model tends to default to a narrow demographic when not explicitly guided.
    // To avoid repeated “white male with brown hair” outputs, we inject a concrete
    // demographic descriptor (unless the user prompt already specifies one).
    const lowerPrompt = String(characterPrompt || "").toLowerCase();
    const hasExplicitGender = /\b(woman|female|girl|man|male|boy|non[-\s]?binary|enby|androgynous)\b/i.test(lowerPrompt);
    const hasExplicitSkinOrEthnicity = /\b(black|african|brown[-\s]?skinned|dark[-\s]?skinned|latina|latino|hispanic|asian|south asian|indian|middle eastern|arab|native|indigenous)\b/i.test(lowerPrompt);
    const hasExplicitHair = /\b(blonde|blond|redhead|red hair|ginger|auburn|gray hair|grey hair|white hair|silver hair|pink hair|blue hair|purple hair|bald|shaved|braids|locs|dreads|afro|curly|coily)\b/i.test(lowerPrompt);

    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    // Weighted away from defaults: only one “light skin” option.
    const skinTone = hasExplicitSkinOrEthnicity
      ? null
      : pick([
          "deep dark skin",
          "dark brown skin",
          "medium brown skin",
          "olive skin",
          "light skin",
        ]);

    const genderPresentation = hasExplicitGender
      ? null
      : pick(["feminine-presenting", "masculine-presenting", "androgynous-presenting"]);

    const hairDescription = hasExplicitHair
      ? null
      : `${pick(["black", "blonde", "red", "auburn", "silver", "blue", "purple"])} ${pick([
          "curly hair",
          "coily hair",
          "wavy hair",
          "straight hair",
          "braids",
          "locs",
          "short hair",
          "long hair",
          "bald head",
        ])}`;

    const forcedDemographic = [genderPresentation, skinTone, hairDescription].filter(Boolean).join(", ");
    const demographicConstraint = forcedDemographic
      ? `\nDEMOGRAPHIC DIVERSITY (MANDATORY):\n- For THIS generation, depict the character as: ${forcedDemographic}.\n- Do NOT default to a white male with brown hair unless explicitly requested.\n`
      : `\nDEMOGRAPHIC DIVERSITY (MANDATORY):\n- Do NOT default to a white male with brown hair unless explicitly requested.\n`;

    // Build the prompt for a friendly, cartoon-style fitness avatar
    // Only include animal-specific instructions if this is actually an animal character
    const animalInstructions = isAnimalCharacter ? `
CRITICAL ANIMAL CHARACTER REQUIREMENT:
- This IS an animal character - they MUST be anthropomorphic, standing UPRIGHT on their HIND LEGS like a human
- Animal characters should have a humanoid posture: standing on two legs, arms/front paws at their sides or in a friendly pose
- NEVER show animal characters on all fours or in a natural animal stance
- Animal characters should look like cartoon mascots (think Zootopia, Animal Crossing style)
` : `
CHARACTER TYPE NOTE:
- This is a HUMAN or SUPERHERO character - do NOT make them look like an animal
- Follow the character description exactly as written
`;

    const imagePrompt = `Create a friendly, cartoon-style fitness avatar character portrait. The character is: ${characterPrompt}. 

CRITICAL BACKGROUND REQUIREMENT:
- The background MUST be completely plain white (#FFFFFF) with NO gradients, shadows, or any other elements
- The character should be isolated on a pure white background for easy integration into app interfaces
${animalInstructions}
${demographicConstraint}
AGE DEMOGRAPHIC PREFERENCE:
- STRONGLY prefer young adult and adult characters (ages 18-40 appearance)
- We already have many child characters, so lean toward mature but friendly adult representations
- Adults can still be cute and cartoon-style while looking like grown-ups
- For superhero characters: can be any age but default to adult unless specified

DEMOGRAPHIC DIVERSITY (CRITICAL):
- Vary skin tones across the full human spectrum: light, medium, olive, tan, brown, dark brown, deep black
- Vary hair colors beyond brown: black, blonde, red, auburn, gray, white, colorful dyed (pink, blue, purple, silver)
- Vary hair textures and styles: straight, wavy, curly, coily, locs, braids, short, long, bald, mohawk, etc.
- Include diverse genders: masculine, feminine, androgynous presentations
- For this specific character, randomly select diverse features rather than defaulting to "standard" appearances
- AVOID repeatedly generating the same demographic (white male with brown hair)

SUPERHERO VARIETY (if character is a superhero type):
- Embrace diverse superhero styles: classic caped heroes, tech-suited heroes, elemental powers, cosmic heroes, speedsters, strength-based heroes, flying heroes, ninja/stealth heroes, magical heroes, armored heroes
- Superheroes should have distinctive costumes, emblems, or visual powers
- Keep the friendly, approachable cartoon style even for superhero characters

Style requirements:
- Bright, cheerful cartoon/animated art style similar to modern mobile games
- Character should be standing in a confident, friendly pose
- Full body view showing the character ready for any sport or exercise
- Expressive, welcoming face with a smile
- High quality, professional illustration
- The character should look approachable and motivating for fitness
- Vibrant colors and clean lines
- Do NOT emphasize muscles, abs, or exaggerated athletic physiques - keep the body proportions natural and cute
- No text, logos, or decorative elements in the image
- No shadows on the background`;

    // Call Lovable AI to generate the image
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: imagePrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    // Extract image from response
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("No image in AI response:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "No image generated. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract base64 data
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Upload to storage
    const fileName = `avatar-${avatarId}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("app-assets")
      .upload(`fitness-avatars/${fileName}`, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload image");
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("app-assets")
      .getPublicUrl(`fitness-avatars/${fileName}`);

    const imageUrl = urlData.publicUrl;

    // Update the avatar record with the new image
    const { error: updateError } = await supabase
      .from("fitness_avatars")
      .update({ preview_image_url: imageUrl })
      .eq("id", avatarId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Failed to update avatar record");
    }

    console.log(`Avatar image generated successfully: ${imageUrl}`);

    return new Response(
      JSON.stringify({ success: true, imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating avatar image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate image" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
