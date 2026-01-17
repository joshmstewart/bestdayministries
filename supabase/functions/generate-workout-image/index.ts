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

    const { avatarId, activityName, imageType, workoutLogId, isAdminTest, location } = await req.json();

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
    let selectedWorkoutName: string | null = null;
    
    // Check if avatar has an image to use for image-to-image
    const avatarImageUrl = avatar.image_url;
    
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
      // Use user's enabled locations if available
      if (isAdminTest || !location) {
        // First, get user's enabled locations
        const { data: userLocationPrefs } = await supabase
          .from("user_workout_locations")
          .select("location_id, is_enabled")
          .eq("user_id", user.id);
        
        // Build the query for locations
        let locationsQuery = supabase
          .from("workout_locations")
          .select("id, name, prompt_text, pack_id")
          .eq("is_active", true);
        
        // If user has location preferences, filter to only enabled ones
        if (userLocationPrefs && userLocationPrefs.length > 0) {
          const enabledLocationIds = userLocationPrefs
            .filter(pref => pref.is_enabled)
            .map(pref => pref.location_id);
          
          // If user has explicitly disabled all locations, use all active ones
          if (enabledLocationIds.length > 0) {
            locationsQuery = locationsQuery.in("id", enabledLocationIds);
          }
        }
        
        const { data: locations, error: locationsError } = await locationsQuery;
        
        if (locationsError || !locations || locations.length === 0) {
          console.error("No locations found:", locationsError);
          throw new Error("No workout locations found in database");
        }
        
        const randomLocation = locations[Math.floor(Math.random() * locations.length)];
        selectedLocation = randomLocation.prompt_text;
        selectedLocationName = randomLocation.name;
        console.log("Selected random location:", selectedLocationName, "-", selectedLocation);
      } else {
        selectedLocation = location;
        selectedLocationName = location;
      }
      
      prompt = `Take this character and show them actively doing ${selectedWorkout} ${selectedLocation}. Keep the character looking exactly the same (same outfit, colors, style, features) but change their pose to be dynamic and energetic while exercising. Add the location as the background. Make them look happy and motivated. High quality cartoon illustration.`;
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
      
      prompt = `Take this character and show them celebrating with arms raised in victory ${selectedLocation}. Keep the character looking exactly the same (same outfit, colors, style, features) but change their pose to be celebratory. Add confetti, streamers, and a trophy or medal. Make them look extremely happy and proud. Colorful celebratory background with sparkles. High quality cartoon illustration.`;
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

    // Call Lovable AI to generate/edit the image
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
        location_name: selectedLocationName || null,
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
