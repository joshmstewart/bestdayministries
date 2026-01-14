import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { characterType, description } = await req.json();

    if (!characterType) {
      throw new Error("Character type is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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

    return new Response(
      JSON.stringify({ imageUrl: imageData }),
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
