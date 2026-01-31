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

    // Get the fitness avatar to include its name and image in the generation
    const { data: avatarData, error: avatarFetchError } = await supabaseAdmin
      .from("fitness_avatars")
      .select("name, image_url, preview_image_url, character_prompt")
      .eq("id", avatarId)
      .single();

    if (avatarFetchError || !avatarData) {
      throw new Error("Avatar not found");
    }

    const avatarName = avatarData?.name?.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() || 'avatar';
    
    // Use image-to-image if avatar has an image (like generate-workout-image does)
    const avatarImageUrl = avatarData.image_url || avatarData.preview_image_url;

    console.log(`Generating avatar emotion image: avatar=${avatarId} (${avatarName}), emotion=${emotionTypeId}`);
    console.log(`Avatar image URL for reference: ${avatarImageUrl}`);

    // Build message content - use image-to-image if avatar has an image
    let messageContent: any;
    
    if (avatarImageUrl) {
      // Use image-to-image editing with the avatar's actual image as reference
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
      console.log("Using image-to-image with avatar reference image");
    } else {
      // Fallback to text-only generation if no avatar image
      messageContent = `${avatarData.character_prompt || avatarData.name}, ${prompt}`;
      console.log("Fallback: Using text-only generation (no avatar image)");
    }

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
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in AI response:", JSON.stringify(aiData));
      throw new Error("No image returned from AI");
    }

    // Upload to Supabase Storage with retry logic
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    
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
