import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generic chore activities for celebration images (not specific to user's chores)
const CHORE_ACTIVITIES = [
  { name: "Washing Dishes", prompt: "washing dishes at a sparkling clean kitchen sink with soap bubbles" },
  { name: "Sweeping", prompt: "sweeping the floor with a broom, leaving a clean path behind" },
  { name: "Vacuuming", prompt: "vacuuming a carpet with a modern vacuum cleaner" },
  { name: "Making the Bed", prompt: "making a bed with fresh sheets and fluffy pillows" },
  { name: "Folding Laundry", prompt: "folding clean laundry neatly into organized stacks" },
  { name: "Watering Plants", prompt: "watering indoor plants with a watering can, plants looking healthy and green" },
  { name: "Taking Out Trash", prompt: "carrying a trash bag to take outside, keeping things tidy" },
  { name: "Organizing Shelves", prompt: "organizing items neatly on shelves, everything in its place" },
  { name: "Wiping Counters", prompt: "wiping down kitchen counters with a cloth until they sparkle" },
  { name: "Feeding a Pet", prompt: "lovingly feeding a pet, the animal looking happy and grateful" },
  { name: "Dusting", prompt: "dusting furniture with a feather duster, surfaces gleaming" },
  { name: "Mopping", prompt: "mopping a floor with a mop bucket, floor looking shiny and clean" },
  { name: "Setting the Table", prompt: "setting a table with plates, napkins, and utensils for a meal" },
  { name: "Tidying Up Toys", prompt: "putting toys away neatly into a toy box or on shelves" },
  { name: "Brushing Teeth", prompt: "brushing teeth at the bathroom sink with a toothbrush" },
];

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

    const { targetUserId } = await req.json();

    // Use targetUserId if provided (for guardians acting on behalf of bestie), otherwise use the authenticated user
    const userId = targetUserId || user.id;

    // Verify if using targetUserId that user is a guardian of that bestie
    if (targetUserId && targetUserId !== user.id) {
      const { data: link, error: linkError } = await supabase
        .from("caregiver_bestie_links")
        .select("id")
        .eq("caregiver_id", user.id)
        .eq("bestie_id", targetUserId)
        .maybeSingle();

      if (linkError || !link) {
        // Also check if admin/owner
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!roleData || !["admin", "owner"].includes(roleData.role)) {
          throw new Error("Not authorized to generate images for this user");
        }
      }
    }

    // Get user's selected fitness avatar
    const { data: userAvatar, error: avatarError } = await supabase
      .from("user_fitness_avatars")
      .select("avatar_id, fitness_avatars(*)")
      .eq("user_id", userId)
      .eq("is_selected", true)
      .maybeSingle();

    if (avatarError || !userAvatar?.fitness_avatars) {
      // No avatar selected - return gracefully (same as workout behavior)
      console.log("No avatar selected for user", userId);
      return new Response(
        JSON.stringify({ 
          success: false, 
          skipped: true,
          reason: "No fitness avatar selected" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const avatar = userAvatar.fitness_avatars as any;
    const avatarImageUrl = avatar.image_url || avatar.preview_image_url;

    if (!avatarImageUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          skipped: true,
          reason: "Avatar has no image" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pick a random generic chore activity
    const randomActivity = CHORE_ACTIVITIES[Math.floor(Math.random() * CHORE_ACTIVITIES.length)];
    console.log("Selected random chore activity:", randomActivity.name);

    // Get user's enabled location packs (same pattern as workout image generation)
    const { data: userPacks } = await supabase
      .from("user_workout_location_packs")
      .select("pack_id, is_enabled")
      .eq("user_id", userId);

    // Get all free packs (these are always available)
    const { data: freePacks } = await supabase
      .from("workout_location_packs")
      .select("id")
      .eq("is_active", true)
      .eq("is_free", true);

    const freePackIds = (freePacks || []).map((p) => p.id);

    // Build list of enabled pack IDs
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

    // Query locations from enabled packs
    let locationsQuery = supabase
      .from("workout_locations")
      .select("id, name, prompt_text, pack_id, workout_location_packs(name)")
      .eq("is_active", true);

    if (enabledPackIds.size > 0) {
      locationsQuery = locationsQuery.in("pack_id", Array.from(enabledPackIds));
    }

    const { data: locations, error: locationsError } = await locationsQuery;

    let selectedLocation = "a cozy, cheerful home interior";
    let selectedLocationName: string | null = null;
    let selectedLocationId: string | null = null;
    let selectedLocationPackName: string | null = null;

    if (!locationsError && locations && locations.length > 0) {
      // Get user's recently used locations to avoid repetition
      const { data: recentImages } = await supabase
        .from("chore_celebration_images")
        .select("location_id")
        .eq("user_id", userId)
        .not("location_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);

      const recentLocationIds = new Set(
        (recentImages || []).map((img) => img.location_id).filter(Boolean)
      );

      // Filter out recently used locations if we have enough variety
      let availableLocations = locations.filter(
        (loc) => !recentLocationIds.has(loc.id)
      );

      // If we've used most locations, allow repeats from older ones
      if (availableLocations.length < 3) {
        const veryRecentIds = new Set(
          (recentImages || []).slice(0, 3).map((img) => img.location_id).filter(Boolean)
        );
        availableLocations = locations.filter(
          (loc) => !veryRecentIds.has(loc.id)
        );
      }

      // If still not enough, just use all locations
      if (availableLocations.length === 0) {
        availableLocations = locations;
      }

      // Pick a random location
      const randomLocation = availableLocations[Math.floor(Math.random() * availableLocations.length)];
      selectedLocation = randomLocation.prompt_text;
      selectedLocationName = randomLocation.name;
      selectedLocationId = randomLocation.id;
      selectedLocationPackName = (randomLocation as any).workout_location_packs?.name || null;
      console.log("Selected location:", selectedLocationName, "- Pack:", selectedLocationPackName);
    } else {
      console.log("No locations found, using default home interior");
    }

    // Build sex/anatomical consistency constraint if defined
    let sexConstraint = "";
    if (avatar.sex === "male") {
      sexConstraint = " CRITICAL ANATOMICAL CONSISTENCY: This character is MALE. The body MUST have a masculine build - muscular pecs are fine but NO breasts or feminine breast-like shapes. Use masculine torso proportions and an appropriate male physique. Do NOT give this character any feminine body characteristics.";
    } else if (avatar.sex === "female") {
      sexConstraint = " CRITICAL ANATOMICAL CONSISTENCY: This character is FEMALE. The body should have a feminine build with appropriate female proportions. Maintain feminine body characteristics consistently.";
    } else if (avatar.sex === "androgynous") {
      sexConstraint = " CRITICAL ANATOMICAL CONSISTENCY: This character is ANDROGYNOUS. The body should have a neutral, gender-ambiguous build - neither distinctly masculine nor feminine. Use slender proportions, a flat or very subtle chest, and avoid strongly gendered body characteristics.";
    }

    // Check for character-specific enhancements
    const lowerName = String(avatar.name || "").toLowerCase();
    const isBubbleBenny = lowerName.includes("bubble benny");
    const isXeroxXander = lowerName.includes("xerox xander");

    let characterEnhancements = "";
    if (isBubbleBenny) {
      characterEnhancements = " CRITICAL: This character is 'Bubble Benny' - they MUST have iridescent soap bubbles floating around them and soap-bubble texture on their skin.";
    } else if (isXeroxXander) {
      characterEnhancements = " CRITICAL: This character is 'Xerox Xander' whose superpower is that he copied/duplicated himself. You MUST show TWO IDENTICAL versions of this character side by side doing the chore TOGETHER.";
    }

    // Build the prompt
    const prompt = `Use the EXACT same character from the reference image. Show them ${randomActivity.prompt}, looking proud and happy about completing their chores. Keep the character COMPLETELY identical - same gender, face, hair, art style, AND their thematic identity/costume style. Adapt their outfit appropriately for the household task.${sexConstraint}${characterEnhancements} Background/location: ${selectedLocation}. The character should have a celebratory, accomplished expression. High quality, bright and cheerful cartoon illustration style.`;

    console.log("Generating chore celebration image");
    console.log("Activity:", randomActivity.name);
    console.log("Location:", selectedLocationName || "default");

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
    const today = new Date().toISOString().split("T")[0];
    const timestamp = Date.now();
    const fileName = `${userId}/${today}_${timestamp}.png`;

    // Upload to Supabase Storage (use workout-images bucket which already exists)
    const { error: uploadError } = await supabase.storage
      .from("workout-images")
      .upload(`chore-celebrations/${fileName}`, imageBuffer, {
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
      .getPublicUrl(`chore-celebrations/${fileName}`);

    const imageUrl = urlData.publicUrl;

    // Save to database with location info
    const { data: savedImage, error: saveError } = await supabase
      .from("chore_celebration_images")
      .insert({
        user_id: userId,
        avatar_id: avatar.id,
        image_url: imageUrl,
        activity_category: randomActivity.name,
        completion_date: today,
        location_id: selectedLocationId,
        location_name: selectedLocationName,
        location_pack_name: selectedLocationPackName,
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
        activity: randomActivity.name,
        location: selectedLocationName,
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
