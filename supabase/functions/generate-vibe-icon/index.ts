import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vibeId, vibeName, atmosphereHint } = await req.json();

    if (!vibeId || !vibeName) {
      return new Response(
        JSON.stringify({ error: 'vibeId and vibeName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating icon for vibe: ${vibeName}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Create a prompt for the vibe icon - matches ingredient icon style
    const prompt = `Create a 256x256 pixel icon representing "${vibeName}" for a coffee drink app. Visually capture: ${atmosphereHint || vibeName}.

MANDATORY REQUIREMENTS:
1. FRAMING: The main visual element must fill 70-80% of the image - make it LARGE and prominent
2. CORNERS: RECTANGULAR image with SHARP 90-DEGREE CORNERS ONLY. DO NOT round ANY edges. DO NOT use circular or oval frames. DO NOT add ANY curved borders or vignettes. The corners must be perfectly square like a photograph.
3. BACKGROUND: Solid single flat color extending to ALL four corners with NO gradients, NO fading, NO corner treatments, NO vignettes, NO circular highlights
4. STYLE: Cute illustrated style, evocative and atmospheric, no text

FORBIDDEN: rounded corners, circular frames, oval shapes, curved edges, border radius, vignette effects, corner fading`;

    // Generate image using Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract the base64 image from the response
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error('No image in response:', JSON.stringify(data));
      throw new Error('No image generated');
    }

    // Convert base64 to blob
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upload to Supabase Storage
    const fileName = `vibe-icons/${vibeId}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('app-assets')
      .upload(fileName, imageBytes, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('app-assets')
      .getPublicUrl(fileName);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Update the vibe record with the image URL
    const { error: updateError } = await supabase
      .from('drink_vibes')
      .update({ image_url: publicUrl })
      .eq('id', vibeId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update vibe: ${updateError.message}`);
    }

    console.log(`Successfully generated icon for ${vibeName}: ${publicUrl}`);

    return new Response(
      JSON.stringify({ success: true, imageUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating vibe icon:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});