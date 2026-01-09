import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to upload with retry
async function uploadWithRetry(
  supabase: any,
  fileName: string,
  imageBytes: Uint8Array,
  maxRetries = 3
): Promise<{ data: any; error: any }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { data, error } = await supabase.storage
      .from('app-assets')
      .upload(fileName, imageBytes, {
        contentType: 'image/png',
        upsert: false
      });

    if (!error) {
      return { data, error: null };
    }

    // If it's a timeout or 5xx error, retry
    const errorStatus = (error as any).status || (error as any).statusCode || 0;
    const isRetryable = error.message?.includes('timeout') || 
                        error.message?.includes('timed out') ||
                        (errorStatus >= 500);
    
    if (isRetryable && attempt < maxRetries) {
      console.log(`Upload attempt ${attempt} failed: ${error.message}, retrying in ${attempt * 2}s...`);
      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      continue;
    }

    return { data: null, error };
  }
  return { data: null, error: new Error('Max retries exceeded') };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating coloring page with prompt:", prompt);

    // Use Lovable AI gateway with the correct endpoint for image generation
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: `Create a coloring book cover illustration for: ${prompt}

STYLE REQUIREMENTS:
- Black and white LINE ART style with clean outlines
- Bold, clear black outlines on white background
- NO shading, NO gradients, NO filled areas, NO colors
- Simple, child-friendly design suitable for coloring with crayons or markers
- Clear separation between elements so they can be colored individually
- Whimsical and fun coloring book aesthetic

CRITICAL: Do NOT include any text, words, letters, titles, or writing in the image. Generate a purely visual line art illustration with NO TEXT whatsoever. The image should be black and white line art only - no titles, labels, captions, or character names visible anywhere.`
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", errorText);
      throw new Error(`Failed to generate image: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("AI response received");
    
    // Extract the base64 image from the response
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("No image in response");
    }

    // Upload the base64 image to Supabase Storage
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Convert base64 to blob
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const fileName = `coloring-covers/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    
    const { data: uploadData, error: uploadError } = await uploadWithRetry(
      supabase,
      fileName,
      imageBytes
    );

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('app-assets')
      .getPublicUrl(fileName);

    console.log("Image uploaded successfully:", publicUrlData.publicUrl);

    return new Response(
      JSON.stringify({ imageUrl: publicUrlData.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating coloring page:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
