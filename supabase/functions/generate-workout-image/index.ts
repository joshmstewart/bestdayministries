import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { avatarId, activityName, imageType, workoutLogId, isAdminTest, location } = await req.json();

    if (!avatarId || !imageType) {
      throw new Error("avatarId and imageType are required");
    }

    // Get the avatar details and user's auto-share preference in parallel
    const [avatarResult, profileResult] = await Promise.all([
      supabase
        .from("fitness_avatars")
        .select("*")
        .eq("id", avatarId)
        .single(),
      supabase
        .from("profiles")
        .select("auto_share_workout_images")
        .eq("id", user.id)
        .single()
    ]);

    const { data: avatar, error: avatarError } = avatarResult;
    const autoShareEnabled = profileResult.data?.auto_share_workout_images ?? true;

    if (avatarError || !avatar) {
      throw new Error("Avatar not found");
    }

    // Check if user is admin/owner for admin test mode
    let isAdmin = false;
    if (isAdminTest) {
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      isAdmin = userRole?.role === "admin" || userRole?.role === "owner";
      
      if (!isAdmin) {
        throw new Error("Admin access required for testing");
      }
    }

    // Verify user owns or has access to this avatar (skip for admin tests)
    if (!avatar.is_free && !isAdmin) {
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

    // Build the image editing prompt
    let prompt: string;
    let selectedLocation: string | null = null;
    let selectedWorkout: string | null = null;
    let selectedLocationName: string | null = null;
    let selectedLocationPackName: string | null = null;
    let selectedLocationId: string | null = null;
    let selectedWorkoutName: string | null = null;
    
    // Check if avatar has an image to use for image-to-image
    // Prefer `image_url`, fall back to `preview_image_url` (most avatars only have preview images)
    const avatarImageUrl = avatar.image_url || avatar.preview_image_url;

    if (imageType === "activity") {
      // For admin test or when not provided, fetch random from database
      if (isAdminTest || !activityName) {
        // Fetch a random active workout activity from the database
        const { data: activities, error: activitiesError } = await supabase
          .from("workout_activities")
          .select("id, name, description, icon")
          .eq("is_active", true);

        if (activitiesError || !activities || activities.length === 0) {
          console.error("No activities found:", activitiesError);
          throw new Error("No workout activities found in database");
        }

        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        selectedWorkout = randomActivity.description || randomActivity.name;
        selectedWorkoutName = `${randomActivity.icon} ${randomActivity.name}`;
        console.log("Selected random activity:", selectedWorkoutName, "-", selectedWorkout);
      } else {
        selectedWorkout = activityName;
        selectedWorkoutName = activityName;
      }

      // For admin test or when not provided, fetch random location from database
      // Use user's enabled location packs to filter available locations
      if (isAdminTest || !location) {
        // Get user's owned/enabled location packs
        const { data: userPacks } = await supabase
          .from("user_workout_location_packs")
          .select("pack_id, is_enabled")
          .eq("user_id", user.id);

        // Get all free packs (these are always available)
        const { data: freePacks } = await supabase
          .from("workout_location_packs")
          .select("id")
          .eq("is_active", true)
          .eq("is_free", true);

        const freePackIds = (freePacks || []).map((p) => p.id);

        // Build list of enabled pack IDs
        // Include free packs (default enabled) and user-owned packs that are enabled
        const enabledPackIds = new Set<string>(freePackIds);

        if (userPacks && userPacks.length > 0) {
          for (const up of userPacks) {
            if (up.is_enabled) {
              enabledPackIds.add(up.pack_id);
            } else {
              // If user explicitly disabled a free pack, remove it
              enabledPackIds.delete(up.pack_id);
            }
          }
        }

        // Query locations from enabled packs (include pack name for display)
        let locationsQuery = supabase
          .from("workout_locations")
          .select("id, name, prompt_text, pack_id, workout_location_packs(name)")
          .eq("is_active", true);

        if (enabledPackIds.size > 0) {
          locationsQuery = locationsQuery.in("pack_id", Array.from(enabledPackIds));
        }

        const { data: locations, error: locationsError } = await locationsQuery;

        if (locationsError || !locations || locations.length === 0) {
          console.error("No locations found:", locationsError);
          throw new Error(
            "No workout locations found in database. Enable some location packs first!"
          );
        }

        // Get user's recently used locations (last 20) to avoid repetition
        const { data: recentImages } = await supabase
          .from("workout_generated_images")
          .select("location_id")
          .eq("user_id", user.id)
          .not("location_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(20);

        const recentLocationIds = new Set(
          (recentImages || []).map((img) => img.location_id).filter(Boolean)
        );

        // Filter out recently used locations if we have enough variety
        let availableLocations = locations.filter(
          (loc) => !recentLocationIds.has(loc.id)
        );

        // If we've used most locations, allow repeats from older ones
        // but still exclude the last 5 to prevent immediate repeats
        if (availableLocations.length < 3) {
          const veryRecentIds = new Set(
            (recentImages || []).slice(0, 5).map((img) => img.location_id).filter(Boolean)
          );
          availableLocations = locations.filter(
            (loc) => !veryRecentIds.has(loc.id)
          );
        }

        // If still not enough, just use all locations
        if (availableLocations.length === 0) {
          availableLocations = locations;
        }

        // Use weighted random selection favoring less-used packs
        // Group by pack and pick a random pack first, then random location
        const locationsByPack = new Map<string, typeof locations>();
        for (const loc of availableLocations) {
          const packId = loc.pack_id;
          if (!locationsByPack.has(packId)) {
            locationsByPack.set(packId, []);
          }
          locationsByPack.get(packId)!.push(loc);
        }

        // Pick a random pack, then a random location from that pack
        const packIds = Array.from(locationsByPack.keys());
        const randomPackId = packIds[Math.floor(Math.random() * packIds.length)];
        const packLocations = locationsByPack.get(randomPackId)!;
        const randomLocation = packLocations[Math.floor(Math.random() * packLocations.length)];

        selectedLocation = randomLocation.prompt_text;
        selectedLocationName = randomLocation.name;
        selectedLocationId = randomLocation.id;
        selectedLocationPackName = (randomLocation as any).workout_location_packs?.name || null;
        console.log(
          "Selected location (avoiding recent):",
          selectedLocationName,
          "- Pack:",
          selectedLocationPackName,
          "- Available locations:",
          availableLocations.length,
          "of",
          locations.length
        );
      } else {
        selectedLocation = location;
        selectedLocationName = location;
      }

      // Check for character-specific enhancements
      const lowerName = String(avatar.name || "").toLowerCase();
      const isBubbleBenny = lowerName.includes("bubble benny");
      const isXeroxXander = lowerName.includes("xerox xander");
      
      // Build character-specific additions
      let characterEnhancements = "";
      if (isBubbleBenny) {
        // Bubble Benny should always have soap bubbles on him
        characterEnhancements = " CRITICAL: This character is 'Bubble Benny' - they MUST have iridescent soap bubbles floating around them and soap-bubble texture on their skin. If the activity allows (not swimming/underwater), they should also be holding a bubble wand and blowing a big soap bubble while doing the activity.";
      } else if (isXeroxXander) {
        // Xerox Xander's whole concept is that he copied himself - always show 2 identical characters
        characterEnhancements = " CRITICAL: This character is 'Xerox Xander' whose superpower is that he copied/duplicated himself. You MUST show TWO IDENTICAL versions of this character side by side doing the workout TOGETHER. Both copies should look exactly the same - same outfit, same pose (or mirrored), same expression. The twins should be doing the activity together like workout buddies.";
      }

      // Build sex/anatomical consistency constraint if defined
      let sexConstraint = "";
      if (avatar.sex === "male") {
        sexConstraint = " CRITICAL ANATOMICAL CONSISTENCY: This character is MALE. The body MUST have a masculine build - muscular pecs are fine but NO breasts or feminine breast-like shapes. Use masculine torso proportions and an appropriate male physique including a visible bulge in the crotch area if the lower body is visible. Do NOT give this character any feminine body characteristics.";
      } else if (avatar.sex === "female") {
        sexConstraint = " CRITICAL ANATOMICAL CONSISTENCY: This character is FEMALE. The body should have a feminine build with appropriate female proportions. Maintain feminine body characteristics consistently.";
      } else if (avatar.sex === "androgynous") {
        sexConstraint = " CRITICAL ANATOMICAL CONSISTENCY: This character is ANDROGYNOUS. The body should have a neutral, gender-ambiguous build - neither distinctly masculine nor feminine. Use slender proportions, a flat or very subtle chest, and avoid strongly gendered body characteristics. The overall appearance should be balanced and non-binary.";
      }

      prompt = `Use the EXACT same character from the reference image. Show them clearly and actively doing the workout: "${selectedWorkout}". Keep the character COMPLETELY identical - same gender, face, hair, art style, AND MOST IMPORTANTLY their thematic identity/costume style (e.g., if they're a mage they should wear mage-themed athletic wear, if they're a superhero they should wear superhero-themed gear, if they're in fantasy armor they should have fantasy-styled workout clothes, etc.). The outfit should be adapted for the activity but PRESERVE the character's signature look/theme/vibe.${sexConstraint}${characterEnhancements} Background/location: ${selectedLocation}. Make the action unmistakable (movement, posture, props if needed). High quality cartoon illustration.`;
    } else if (imageType === "celebration") {
      // For celebration, also use real location if in admin test
      if (isAdminTest || !location) {
        const { data: locations, error: locationsError } = await supabase
          .from("workout_locations")
          .select("id, name, prompt_text")
          .eq("is_active", true);

        if (locationsError || !locations || locations.length === 0) {
          selectedLocation = "a beautiful outdoor setting";
          selectedLocationName = "Outdoor Setting";
        } else {
          const randomLocation = locations[Math.floor(Math.random() * locations.length)];
          selectedLocation = randomLocation.prompt_text;
          selectedLocationName = randomLocation.name;
        }
      } else {
        selectedLocation = location;
        selectedLocationName = location;
      }

      // Check for character-specific enhancements (celebration)
      const celebLowerName = String(avatar.name || "").toLowerCase();
      const isBubbleBennyCelebration = celebLowerName.includes("bubble benny");
      const isXeroxXanderCelebration = celebLowerName.includes("xerox xander");
      
      let celebrationCharacterEnhancements = "";
      if (isBubbleBennyCelebration) {
        celebrationCharacterEnhancements = " CRITICAL: This character is 'Bubble Benny' - they MUST have iridescent soap bubbles floating all around them and soap-bubble texture on their skin. They should also be holding a bubble wand and blowing a big celebratory soap bubble.";
      } else if (isXeroxXanderCelebration) {
        celebrationCharacterEnhancements = " CRITICAL: This character is 'Xerox Xander' whose superpower is that he copied/duplicated himself. You MUST show TWO IDENTICAL versions of this character side by side celebrating together. Both copies should look exactly the same and be doing the same celebration pose or mirrored poses. Show the twins high-fiving, jumping together, or doing synchronized celebration moves.";
      }

      // Build sex/anatomical consistency constraint if defined (for celebration)
      let celebrationSexConstraint = "";
      if (avatar.sex === "male") {
        celebrationSexConstraint = " CRITICAL ANATOMICAL CONSISTENCY: This character is MALE. The body MUST have a masculine build - muscular pecs are fine but NO breasts or feminine breast-like shapes. Use masculine torso proportions and an appropriate male physique including a visible bulge in the crotch area if the lower body is visible. Do NOT give this character any feminine body characteristics.";
      } else if (avatar.sex === "female") {
        celebrationSexConstraint = " CRITICAL ANATOMICAL CONSISTENCY: This character is FEMALE. The body should have a feminine build with appropriate female proportions. Maintain feminine body characteristics consistently.";
      } else if (avatar.sex === "androgynous") {
        celebrationSexConstraint = " CRITICAL ANATOMICAL CONSISTENCY: This character is ANDROGYNOUS. The body should have a neutral, gender-ambiguous build - neither distinctly masculine nor feminine. Use slender proportions, a flat or very subtle chest, and avoid strongly gendered body characteristics.";
      }

      prompt = `Use the EXACT same character from the reference image. Show them celebrating a fitness goal with arms raised in victory. Keep the character COMPLETELY identical - same gender, face, hair, art style, AND their thematic identity/costume style (preserve their signature look like mage robes, superhero cape, fantasy elements, etc. but adapted for celebration).${celebrationSexConstraint}${celebrationCharacterEnhancements} Background/location: ${selectedLocation}. Add confetti, streamers, and a trophy or medal. High quality cartoon illustration.`;
    } else {
      throw new Error("Invalid imageType");
    }

    console.log("Generating image with prompt:", prompt);
    console.log("Avatar image URL:", avatarImageUrl);
    console.log("Selected workout:", selectedWorkoutName);
    console.log("Selected location:", selectedLocationName);

    // Build the message content - use image-to-image if avatar has an image
    let messageContent: any;
    
    if (avatarImageUrl) {
      // Use image-to-image editing with the avatar's actual image
      messageContent = [
        {
          type: "text",
          text: prompt,
        },
        {
          type: "image_url",
          image_url: {
            url: avatarImageUrl,
          },
        },
      ];
      console.log("Using image-to-image with avatar image");
    } else {
      // Fallback to text-only generation if no avatar image
      messageContent = `${avatar.character_prompt}, ${prompt}`;
      console.log("Fallback: Using text-only generation (no avatar image)");
    }

    // Call Lovable AI to generate/edit the image with retry logic
    const MAX_RETRIES = 3;
    let imageData: string | null = null;
    let lastError: string | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`Image generation attempt ${attempt}/${MAX_RETRIES}`);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Nano Banana image model
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: messageContent,
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
        console.error(`AI API error (attempt ${attempt}):`, response.status, errorText);
        lastError = "Failed to generate image";
        continue; // Retry on server errors
      }

      const aiResponse = await response.json();
      imageData = aiResponse.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (imageData) {
        console.log(`Image generated successfully on attempt ${attempt}`);
        break; // Success! Exit retry loop
      }
      
      // Model returned text but no image - log and retry
      const textResponse = aiResponse.choices?.[0]?.message?.content;
      console.warn(`Attempt ${attempt}: Model returned text but no image. Text: "${textResponse?.substring(0, 100)}..."`);
      lastError = "AI model did not generate an image. This sometimes happens - retrying...";
    }

    if (!imageData) {
      console.error(`Failed to generate image after ${MAX_RETRIES} attempts`);
      throw new Error(lastError || "No image generated after multiple attempts");
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

    // Save to database (auto-share if user has it enabled and not a test image)
    const { data: savedImage, error: saveError } = await supabase
      .from("workout_generated_images")
      .insert({
        user_id: user.id,
        avatar_id: avatarId,
        workout_log_id: workoutLogId || null,
        image_url: imageUrl,
        image_type: imageType,
        activity_name: activityName || null,
        location_name: selectedLocationName || null,
        location_id: selectedLocationId || null,
        location_pack_name: selectedLocationPackName || null,
        is_test: isAdminTest || false,
        is_shared_to_community: autoShareEnabled && !isAdminTest,
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
        selectedWorkout: selectedWorkoutName,
        selectedLocation: selectedLocationName,
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
