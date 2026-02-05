import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const { prompt, bookTheme } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating coloring page with prompt:", prompt, "bookTheme:", bookTheme);

    // Build the prompt with theme as the PRIMARY instruction if provided
    let imagePrompt = "";
    
    // Check if theme contains "stained glass" for STRICT stained glass rendering
    const isStainedGlass = bookTheme?.toLowerCase().includes("stained glass");
    
    if (isStainedGlass) {
      // STRICT STAINED GLASS MODE - very explicit instructions
      imagePrompt = `CREATE A STAINED GLASS WINDOW COLORING PAGE

SUBJECT: "${prompt}"

MANDATORY STAINED GLASS WINDOW STYLE:
- This MUST look like an actual church stained glass window
- The ENTIRE image is divided into GEOMETRIC SEGMENTS like real stained glass panels
- THICK BLACK LEAD LINES (cames) separate every segment - these are the bold dividing lines between glass pieces
- Each segment is a separate polygon/cell shape
- The subject "${prompt}" is depicted WITHIN the stained glass segments, not as a regular drawing
- Include a decorative border frame like a real window
- Segments should be irregular geometric shapes (not a grid)

COLORING PAGE REQUIREMENTS:
- BLACK LINES ON WHITE BACKGROUND ONLY - no color, no shading, no gray
- ALL lines must form CLOSED shapes (every segment is a fillable region)
- THICK, bold black outlines (the lead lines between glass segments)
- No text, words, or titles
- The entire page should look like a stained glass window ready to be colored

Think of classic church rose windows or Tiffany-style stained glass art.`;
    } else if (bookTheme) {
      // Theme is the DOMINANT style - subject must be rendered IN this style
      imagePrompt = `MANDATORY VISUAL STYLE: ${bookTheme}

The subject is: "${prompt}"

CRITICAL: You MUST render the subject "${prompt}" ENTIRELY in the style of "${bookTheme}".

For example:
- If the theme is "mandala", render the subject as a circular mandala pattern
- If the theme is "Art Nouveau", use flowing organic lines and decorative borders in that style
- If the theme is "zentangle", fill the subject with intricate repetitive patterns

The STYLE "${bookTheme}" must be the dominant visual treatment. The subject "${prompt}" is rendered WITHIN that style.

COLORING PAGE REQUIREMENTS:
- BLACK LINES ON WHITE BACKGROUND ONLY - no color, no shading, no gray
- ALL lines must form CLOSED shapes (for paint bucket fill tools)
- THICK, bold black outlines only
- No text, words, or titles
- Fill the entire page with the illustration`;
    } else {
      imagePrompt = `Create a BLACK AND WHITE LINE ART coloring page: "${prompt}"

CRITICAL REQUIREMENTS:
- BLACK LINES ON WHITE BACKGROUND ONLY
- NO COLOR whatsoever - pure black outlines on white
- NO shading, NO gray tones, NO gradients
- ALL LINES MUST CONNECT - every shape must be fully closed for paint bucket fill
- THICK, bold outlines suitable for coloring
- No text, words, or titles
- Simple, engaging illustration that fills the page`;
    }

    // Use Lovable AI gateway for image generation
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
            content: imagePrompt
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
    
    const fileName = `coloring-pages/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    
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
