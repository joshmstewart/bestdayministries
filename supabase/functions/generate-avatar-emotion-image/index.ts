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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with user's token to verify admin access
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["admin", "owner"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { avatarId, emotionTypeId, prompt, notes } = await req.json();

    if (!avatarId || !emotionTypeId || !prompt) {
      return new Response(JSON.stringify({ error: "Missing required fields: avatarId, emotionTypeId, prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the fitness avatar to include its name, character type, and image in the generation
    const { data: avatarData, error: avatarFetchError } = await supabaseAdmin
      .from("fitness_avatars")
      .select("name, image_url, preview_image_url, character_prompt, character_type")
      .eq("id", avatarId)
      .single();

    if (avatarFetchError || !avatarData) {
      throw new Error("Avatar not found");
    }

    // Get the emotion type details to determine background color
    const { data: emotionData, error: emotionFetchError } = await supabaseAdmin
      .from("emotion_types")
      .select("name, category")
      .eq("id", emotionTypeId)
      .single();

    if (emotionFetchError || !emotionData) {
      throw new Error("Emotion type not found");
    }

    // Determine background color based on emotion category
    const backgroundColors: Record<string, string> = {
      positive: "#4CAF50", // Green
      negative: "#EF5350", // Red
      neutral: "#9E9E9E",  // Gray
    };
    const backgroundColor = backgroundColors[emotionData.category] || "#9E9E9E";
    const emotionName = emotionData.name;

    const avatarName = avatarData?.name?.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() || 'avatar';
    
    // Use image-to-image if avatar has an image (like generate-workout-image does)
    const avatarImageUrl = avatarData.image_url || avatarData.preview_image_url;

    console.log(`Generating avatar emotion image: avatar=${avatarId} (${avatarName}), emotion=${emotionTypeId} (${emotionName}/${emotionData.category})`);
    console.log(`Avatar image URL for reference: ${avatarImageUrl}`);
    console.log(`Using background color: ${backgroundColor}`);

    // Special handling for Grateful - show prayer hands/wings/appendages based on character type
    const isGrateful = emotionName.toLowerCase() === "grateful";
    
    // Build the enhanced prompt with correct background color
    let imageDescription: string;
    if (isGrateful) {
      // For Grateful, show prayer pose with appendages appropriate to the character type
      const characterType = avatarData.character_type?.toLowerCase() || "";
      const characterName = avatarData.name?.toLowerCase() || "";
      
      // Determine appropriate appendage description based on character
      let appendageDescription: string;
      if (characterName.includes("owl") || characterType === "animal" && characterName.includes("bird")) {
        appendageDescription = "wings pressed together in a prayer/namaste position, feathered wing tips touching with the wings pointed upward";
      } else if (characterType === "monster" || characterType === "blob" || characterName.includes("blob") || characterName.includes("slime") || characterName.includes("goo")) {
        appendageDescription = "blob-like appendages shaped vaguely like hands pressed together in a prayer/namaste position, gelatinous surfaces touching with the appendages pointed upward";
      } else if (characterType === "animal") {
        appendageDescription = "paws or appendages pressed together in a prayer/namaste position, touching with the appendages pointed upward";
      } else if (characterType === "robot" || characterName.includes("robot") || characterName.includes("bot")) {
        appendageDescription = "mechanical hands pressed together in a prayer/namaste position, metal palms touching with fingers pointed upward";
      } else {
        // Default for humans/superheroes/other
        appendageDescription = "hands pressed together in a prayer/namaste position, palms touching with fingers pointed upward";
      }
      
      imageDescription = `The character's ${appendageDescription}. Show ONLY the hands/appendages and wrists/lower arms, no face or body. The appendages should match the character's style and coloring. Solid ${backgroundColor} background that fills the entire frame edge-to-edge. Simple, clean emoji-style illustration.`;
    } else {
      // For all other emotions, use floating head style
      imageDescription = `${prompt}. Use a solid ${backgroundColor} background that fills the entire frame edge-to-edge.`;
    }
    
    const enhancedPrompt = `GENERATE AN IMAGE NOW. DO NOT RESPOND WITH TEXT. ONLY OUTPUT AN IMAGE.\n\n${imageDescription}`;
    
    let messageContent: any;
    
    if (avatarImageUrl) {
      // Use image-to-image editing with the avatar's actual image as reference
      messageContent = [
        {
          type: "text",
          text: enhancedPrompt,
        },
        {
          type: "image_url",
          image_url: {
            url: avatarImageUrl,
          },
        },
      ];
      console.log("Using image-to-image with avatar reference image");
    } else {
      // Fallback to text-only generation if no avatar image
      messageContent = `GENERATE AN IMAGE NOW. DO NOT RESPOND WITH TEXT. ONLY OUTPUT AN IMAGE.\n\n${avatarData.character_prompt || avatarData.name}, ${prompt}`;
      console.log("Fallback: Using text-only generation (no avatar image)");
    }

    // Retry logic - model sometimes returns text instead of image
    const maxGenerationAttempts = 3;
    let imageData: string | undefined;
    let lastError: string | null = null;
    
    for (let attempt = 1; attempt <= maxGenerationAttempts; attempt++) {
      console.log(`AI generation attempt ${attempt}/${maxGenerationAttempts}`);
      
      // Generate the image using Lovable AI Gateway
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
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

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error(`AI Gateway error (attempt ${attempt}):`, errorText);
        lastError = `AI generation failed: ${aiResponse.status}`;
        
        if (attempt < maxGenerationAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw new Error(lastError);
      }

      const aiData = await aiResponse.json();
      imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (imageData) {
        console.log(`Image generated successfully on attempt ${attempt}`);
        break;
      }
      
      // Log what we got instead
      const textContent = aiData.choices?.[0]?.message?.content;
      console.warn(`Attempt ${attempt}: AI returned text instead of image: "${textContent?.substring(0, 100)}..."`);
      lastError = "AI returned text instead of image";
      
      if (attempt < maxGenerationAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    if (!imageData) {
      throw new Error(`No image returned after ${maxGenerationAttempts} attempts. Last error: ${lastError}`);
    }

    // Compress the image: resize to 256x256 and convert to WebP
    // The AI model returns base64 PNG, we'll compress it before storage
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    let imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    
    // Use sharp-like compression via Lovable AI Gateway image processing
    // Request a smaller, WebP-optimized version
    const compressionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "GENERATE AN IMAGE NOW. Resize this image to exactly 256x256 pixels. Keep the same content, just make it smaller. Output only the resized image, no text.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageData,
                },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (compressionResponse.ok) {
      const compressedData = await compressionResponse.json();
      const compressedImageUrl = compressedData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (compressedImageUrl) {
        const compressedBase64 = compressedImageUrl.replace(/^data:image\/\w+;base64,/, "");
        imageBuffer = Uint8Array.from(atob(compressedBase64), (c) => c.charCodeAt(0));
        console.log(`Image compressed: original ${base64Data.length} bytes -> compressed ${compressedBase64.length} bytes`);
      } else {
        console.log("Compression didn't return image, using original");
      }
    } else {
      console.log("Compression request failed, using original image");
    }
    
    // Use already-defined avatarName from line 100
    const fileName = `${avatarName}-${emotionTypeId.slice(0, 8)}-${Date.now()}.png`;
    const filePath = `avatar-emotions/${fileName}`;

    let uploadError: Error | null = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const { error } = await supabaseAdmin.storage
        .from("app-assets")
        .upload(filePath, imageBuffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (!error) {
        uploadError = null;
        console.log(`Upload succeeded on attempt ${attempt}`);
        break;
      }
      
      console.error(`Upload attempt ${attempt}/${maxRetries} failed:`, error);
      uploadError = error;
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff: 1s, 2s)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }

    if (uploadError) {
      throw new Error(`Failed to upload image after ${maxRetries} attempts: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("app-assets")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Upsert to database
    const { error: dbError } = await supabaseAdmin
      .from("avatar_emotion_images")
      .upsert({
        avatar_id: avatarId,
        emotion_type_id: emotionTypeId,
        image_url: publicUrl,
        prompt_used: prompt,
        generation_notes: notes || null,
        is_approved: false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "avatar_id,emotion_type_id",
      });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to save to database: ${dbError.message}`);
    }

    console.log(`Successfully generated and saved image: ${publicUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: publicUrl,
        message: "Image generated successfully" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in generate-avatar-emotion-image:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
