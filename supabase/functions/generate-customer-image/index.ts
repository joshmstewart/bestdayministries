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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin access
    const { data: adminCheck, error: adminError } = await supabase.rpc("has_admin_access", {
      _user_id: userData.user.id,
    });

    if (adminError) {
      console.error("Admin check error:", adminError);
      throw adminError;
    }

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { characterType, description, customerId } = await req.json();

    if (!characterType) {
      throw new Error("Character type is required");
    }

    // Build a detailed prompt for diverse customer generation
    const prompt = `Create a hyper-realistic photograph of a person on a PURE WHITE background (#FFFFFF).

Character type: ${characterType}
${description ? `Additional details: ${description}` : ''}

CRITICAL REQUIREMENTS:
- PURE WHITE BACKGROUND - completely solid white (#FFFFFF), no shadows, no gradients, no floor shadows
- Upper body view from waist up, FACING DIRECTLY TOWARD THE CAMERA (frontal view, not angled)
- Looking straight at the camera with natural, friendly expression and a warm smile
- Hyper-realistic photography style with soft, even studio lighting
- The person should look like a real customer ready to make a purchase
- Diverse and inclusive representation
- Authentic, approachable appearance
- No text or logos in the image
- Professional product photography style with sharp focus on the subject
- Clean cutout-ready image with no background elements whatsoever

Style: Professional studio photograph on pure white seamless backdrop, like a stock photo or product catalog image. The background must be completely blank white for easy compositing.`;

    console.log("Generating customer image with prompt:", prompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("No image generated");
    }

    // Check if it's a base64 data URL
    if (!imageData.startsWith("data:image")) {
      console.error("Unexpected image format:", imageData.substring(0, 100));
      throw new Error("Invalid image data format");
    }

    const base64Match = imageData.match(/^data:image\/\w+;base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Invalid base64 image format");
    }

    const imageBase64 = base64Match[1];

    // Convert base64 to buffer
    const imageBuffer = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));

    // Upload to storage
    const fileId = customerId || `temp-${Date.now()}`;
    const fileName = `customer-${fileId}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("app-assets")
      .upload(`cash-register-customers/${fileName}`, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL of the initial image
    const { data: urlData } = supabase.storage
      .from("app-assets")
      .getPublicUrl(`cash-register-customers/${fileName}`);

    console.log("Initial image uploaded:", urlData.publicUrl);

    // Now automatically remove the background
    console.log("Removing background from generated image...");
    
    const removeBackgroundResponse = await fetch(`${supabaseUrl}/functions/v1/remove-customer-background`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl: urlData.publicUrl,
        customerId: fileId,
      }),
    });

    if (!removeBackgroundResponse.ok) {
      const errorText = await removeBackgroundResponse.text();
      console.error("Background removal failed:", errorText);
      // Return original image if background removal fails
      return new Response(
        JSON.stringify({ imageUrl: urlData.publicUrl }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const bgRemovalResult = await removeBackgroundResponse.json();
    const finalImageUrl = bgRemovalResult.imageUrl || urlData.publicUrl;
    
    console.log("Final image with background removed:", finalImageUrl);

    return new Response(
      JSON.stringify({ imageUrl: finalImageUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating customer image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
