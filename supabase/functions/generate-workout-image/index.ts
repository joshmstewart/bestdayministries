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

    // Random locations for variety
    const locations = [
      "a sunny beach at sunrise",
      "a lush green park with trees",
      "a modern gym with equipment",
      "a mountain trail with scenic views",
      "a city rooftop at sunset",
      "a backyard garden",
      "a basketball court",
      "a swimming pool area",
      "a yoga studio with natural light",
      "a forest trail surrounded by nature",
      "a home living room",
      "a sports stadium",
      "a peaceful lake shore",
      "a snowy mountain",
      "a desert landscape at golden hour"
    ];

    // Random workouts for admin testing
    const workouts = [
      "running",
      "yoga",
      "weight lifting",
      "swimming",
      "cycling",
      "dancing",
      "jumping jacks",
      "push-ups",
      "stretching",
      "hiking",
      "boxing",
      "jumping rope",
      "basketball",
      "tennis",
      "pilates"
    ];

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

    // Build the image editing prompt - we'll use the avatar's actual image as input
    let prompt: string;
    let selectedLocation: string | null = null;
    let selectedWorkout: string | null = null;
    
    // Check if avatar has an image to use for image-to-image
    const avatarImageUrl = avatar.image_url;
    
    if (imageType === "activity") {
      // Use provided activity or pick random for admin test
      selectedWorkout = activityName || workouts[Math.floor(Math.random() * workouts.length)];
      selectedLocation = location || locations[Math.floor(Math.random() * locations.length)];
      
      prompt = `Take this character and show them actively doing ${selectedWorkout} exercise in ${selectedLocation}. Keep the character looking exactly the same (same outfit, colors, style, features) but change their pose to be dynamic and energetic while exercising. Add the location as the background. Make them look happy and motivated. High quality cartoon illustration.`;
    } else if (imageType === "celebration") {
      selectedLocation = location || locations[Math.floor(Math.random() * locations.length)];
      prompt = `Take this character and show them celebrating with arms raised in victory in ${selectedLocation}. Keep the character looking exactly the same (same outfit, colors, style, features) but change their pose to be celebratory. Add confetti, streamers, and a trophy or medal. Make them look extremely happy and proud. Colorful celebratory background with sparkles. High quality cartoon illustration.`;
    } else {
      throw new Error("Invalid imageType");
    }

    console.log("Generating image with prompt:", prompt);
    console.log("Avatar image URL:", avatarImageUrl);
    console.log("Selected workout:", selectedWorkout);
    console.log("Selected location:", selectedLocation);

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
        selectedWorkout,
        selectedLocation,
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
