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

    const isNonHumanCharacter = characterType === 'animal' || characterType === 'monster';

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
    // We inject diversity ONLY when the user hasn't specified demographics.
    const lowerPrompt = String(characterPrompt || "").toLowerCase();
    
    // Expanded detection patterns to respect user-specified demographics
    const hasExplicitGender = /\b(woman|female|girl|man|male|boy|non[-\s]?binary|enby|androgynous|feminine|masculine)\b/i.test(lowerPrompt);
    
    // Include ALL skin tone descriptions including light/fair/pale
    const hasExplicitSkinOrEthnicity = /\b(black|african|brown[-\s]?skin|dark[-\s]?skin|light[-\s]?skin|fair[-\s]?skin|pale[-\s]?skin|olive[-\s]?skin|tan[-\s]?skin|medium[-\s]?skin|latina|latino|hispanic|asian|south asian|indian|middle eastern|arab|native|indigenous|caucasian|white|european)\b/i.test(lowerPrompt);
    
    // Include ALL hair color and style descriptions including long/short + color combos
    const hasExplicitHair = /\b(blonde|blond|brunette|redhead|red hair|ginger|auburn|gray hair|grey hair|white hair|silver hair|pink hair|blue hair|purple hair|black hair|brown hair|bald|shaved|braids|locs|dreads|afro|curly|coily|wavy|straight|long hair|short hair)\b/i.test(lowerPrompt);

    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    // Only inject diversity if the user didn't specify demographics
    // If ANY demographic is specified, respect the user's full prompt
    const hasAnyExplicitDemographic = hasExplicitGender || hasExplicitSkinOrEthnicity || hasExplicitHair;
    
    console.log(`Demographic detection - Gender: ${hasExplicitGender}, Skin: ${hasExplicitSkinOrEthnicity}, Hair: ${hasExplicitHair}`);
    
    let demographicConstraint = "";
    
    if (!hasAnyExplicitDemographic && !isNonHumanCharacter) {
      // No user-specified demographics - inject realistic diversity for HUMAN characters only
      // Weighted toward common demographics, not unusual ones
      const skinTone = pick([
        "light skin",
        "light skin",
        "medium skin",
        "tan skin",
        "olive skin",
        "brown skin",
        "brown skin", 
        "dark brown skin",
        "deep dark skin",
      ]);
      const genderPresentation = pick([
        "feminine-presenting",
        "feminine-presenting",
        "masculine-presenting",
        "masculine-presenting",
      ]);
      const hairDescription = `${pick([
        "black",
        "black",
        "brown",
        "brown",
        "brown",
        "blonde",
        "red",
        "auburn",
        "gray",
      ])} ${pick([
        "short hair",
        "short hair",
        "long hair",
        "curly hair",
        "wavy hair",
        "straight hair",
        "braids",
      ])}`;

      const forcedDemographic = [genderPresentation, skinTone, hairDescription].join(", ");
      demographicConstraint = `\nDEMOGRAPHIC DIVERSITY (AUTO-GENERATED since no demographics were specified):\n- For THIS generation, depict the character as: ${forcedDemographic}.\n`;
      console.log(`Auto-generated demographics: ${forcedDemographic}`);
    } else if (hasAnyExplicitDemographic) {
      // User specified demographics - respect them completely
      demographicConstraint = `\nIMPORTANT: The user has specified explicit demographic details in the prompt. Follow these EXACTLY as written. Do NOT override or change the specified skin tone, hair color, hair style, or gender presentation.\n`;
      console.log(`Respecting user-specified demographics in prompt`);
    }
    // For non-human characters (animals, monsters), demographicConstraint stays empty

    // CRITICAL: For monsters, add explicit anti-human constraint
    if (characterType === 'monster') {
      demographicConstraint = `\nMONSTER-SPECIFIC ENFORCEMENT:
- This character MUST NOT have any human features whatsoever
- NO human skin tones (fair, tan, brown, etc.) - use fantasy colors only (purple, green, blue, orange, etc.)
- NO human hair styles or colors - use monster features like spikes, antennae, or unusual textures
- NO human facial structure - use exaggerated monster features
- The end result must be immediately recognizable as a fantasy creature, not a person
`;
    }

    // Build the prompt for a friendly, cartoon-style fitness avatar
    // Character type instructions - only ONE section applies based on type
    let characterTypeInstructions = "";
    
    if (characterType === 'monster') {
      // Randomly select a monster archetype for variety
      const monsterArchetypes = [
        {
          bodyType: "round, blob-like body with tiny stubby legs",
          skinTexture: "smooth rubbery skin",
          colors: "bright lime green with yellow spots",
          eyeStyle: "one giant cyclops eye taking up most of the face",
          mouthStyle: "wide friendly grin with a single snaggletooth",
          extras: "small antenna on top of head"
        },
        {
          bodyType: "tall and lanky with noodle-like arms",
          skinTexture: "fuzzy fur all over",
          colors: "electric blue and teal stripes",
          eyeStyle: "two big googly eyes on stalks",
          mouthStyle: "tiny beak-like mouth",
          extras: "floppy ears and a curly tail"
        },
        {
          bodyType: "short and squat like a cube with rounded edges",
          skinTexture: "bumpy toad-like skin",
          colors: "hot pink with purple polka dots",
          eyeStyle: "three small eyes in a triangle formation",
          mouthStyle: "no visible mouth, just a happy expression",
          extras: "four tiny wings on back"
        },
        {
          bodyType: "pear-shaped with a huge head and tiny body",
          skinTexture: "shimmery scales",
          colors: "sunset orange fading to yellow",
          eyeStyle: "two friendly eyes with thick eyebrows",
          mouthStyle: "big toothy smile with fangs",
          extras: "two small horns and a fluffy mane"
        },
        {
          bodyType: "wide and flat like a pancake standing upright",
          skinTexture: "soft velvety texture",
          colors: "deep purple with glowing turquoise patterns",
          eyeStyle: "many tiny eyes scattered across face",
          mouthStyle: "zigzag smile like a jack-o-lantern",
          extras: "tentacle-like appendages instead of arms"
        },
        {
          bodyType: "spherical bouncy body with spring-like legs",
          skinTexture: "smooth with geometric patterns",
          colors: "coral red and cream",
          eyeStyle: "two half-closed sleepy eyes",
          mouthStyle: "small 'o' shaped mouth",
          extras: "floating crystals orbiting around head"
        },
        {
          bodyType: "long snake-like body standing on a coiled tail",
          skinTexture: "iridescent feathers",
          colors: "rainbow gradient from head to tail",
          eyeStyle: "large almond-shaped eyes with star pupils",
          mouthStyle: "gentle smile with no teeth",
          extras: "feathered crest on head"
        },
        {
          bodyType: "mushroom-shaped with a dome head and stem body",
          skinTexture: "spongy mushroom texture",
          colors: "spotted red and white cap, brown stem",
          eyeStyle: "two dots for eyes under the cap",
          mouthStyle: "small curved smile",
          extras: "tiny spores floating around"
        }
      ];
      
      const archetype = pick(monsterArchetypes);
      
      characterTypeInstructions = `
CRITICAL MONSTERS INC.-STYLE MONSTER REQUIREMENTS:
- This is a FRIENDLY FANTASY MONSTER - NOT A HUMAN in costume or with makeup
- CRITICAL: NO human faces, NO human skin tones, NO human hair, NO human body proportions

SPECIFIC MONSTER DESIGN FOR THIS CHARACTER:
- BODY SHAPE: ${archetype.bodyType}
- SKIN/TEXTURE: ${archetype.skinTexture}
- COLORS: ${archetype.colors}
- EYES: ${archetype.eyeStyle}
- MOUTH: ${archetype.mouthStyle}
- UNIQUE FEATURES: ${archetype.extras}

STYLE NOTES:
- Think Monsters Inc., Trolls, or Lilo & Stitch style creatures
- NEVER create a human face or body - this must be clearly a fantasy creature
- They should be standing UPRIGHT in a humanoid pose ready for fitness activities
- Make them CUTE and APPROACHABLE while being obviously NON-HUMAN monsters
`;
    } else if (characterType === 'animal') {
      characterTypeInstructions = `
CRITICAL ANIMAL CHARACTER REQUIREMENT:
- This is an ANIMAL character - they MUST be anthropomorphic
- Standing UPRIGHT on their HIND LEGS like a human
- Humanoid posture: standing on two legs, arms at their sides or in a friendly pose
- NEVER show them on all fours or in a natural animal stance
- Think Zootopia or Animal Crossing style cartoon mascots
`;
    } else {
      characterTypeInstructions = `
CHARACTER TYPE NOTE:
- This is a HUMAN or SUPERHERO character
- Follow the character description exactly as written
`;
    }

    const imagePrompt = `GENERATE AN IMAGE NOW. Do not describe the image - actually create and return it.

Create a friendly, cartoon-style fitness avatar character portrait. The character is: ${characterPrompt}. 

CRITICAL BACKGROUND REQUIREMENT:
- The background MUST be completely plain white (#FFFFFF) with NO gradients, shadows, or any other elements
- The character should be isolated on a pure white background for easy integration into app interfaces
${characterTypeInstructions}
${demographicConstraint}
AGE DEMOGRAPHIC PREFERENCE:
- STRONGLY prefer young adult and adult characters (ages 18-40 appearance)
- We already have many child characters, so lean toward mature but friendly adult representations
- Adults can still be cute and cartoon-style while looking like grown-ups
- For superhero characters: can be any age but default to adult unless specified

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
- No shadows on the background

OUTPUT: Generate the image immediately.`;

    // Call Lovable AI to generate the image with retry logic
    const MAX_RETRIES = 3;
    let imageData: string | undefined;
    let lastError: string = "unknown";
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`Image generation attempt ${attempt}/${MAX_RETRIES}`);
      
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
        console.error(`AI API error (attempt ${attempt}):`, aiResponse.status, errorText);
        
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
        
        lastError = `AI API error: ${aiResponse.status}`;
        continue; // Retry on other errors
      }

      const aiData = await aiResponse.json();
      console.log(`AI response received (attempt ${attempt})`);

      // Extract image from response
      const extractedImage = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (extractedImage) {
        imageData = extractedImage;
        console.log(`Successfully extracted image on attempt ${attempt}`);
        break; // Success!
      }

      // No image - check for safety block
      const choice = aiData?.choices?.[0];
      const finishReason =
        choice?.native_finish_reason ||
        choice?.finish_reason ||
        choice?.message?.native_finish_reason ||
        "unknown";

      console.error(`No image in AI response (attempt ${attempt}):`, JSON.stringify(aiData));

      // The AI gateway can return an IMAGE_SAFETY block with no images - don't retry this
      if (String(finishReason).toUpperCase().includes("IMAGE_SAFETY")) {
        return new Response(
          JSON.stringify({
            error:
              "Image generation was blocked by the safety filter. Please adjust the prompt and try again.",
            reason: "IMAGE_SAFETY",
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      lastError = `No image returned (reason: ${finishReason})`;
      
      // Small delay before retry
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // If we exhausted all retries without getting an image
    if (!imageData) {
      console.error(`Failed to generate image after ${MAX_RETRIES} attempts: ${lastError}`);
      return new Response(
        JSON.stringify({
          error: "Failed to generate image after multiple attempts. Please try again.",
          reason: lastError,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
