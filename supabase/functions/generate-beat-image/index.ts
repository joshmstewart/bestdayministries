import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PatternData {
  [key: string]: boolean[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { beatId, beatName, instruments, tempo, pattern } = await req.json();

    if (!beatId || !beatName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build a creative prompt based on beat characteristics
    const instrumentList = instruments?.join(", ") || "drums and synths";
    const patternData = pattern as PatternData | undefined;
    const totalNotes = patternData 
      ? Object.values(patternData).reduce((sum: number, steps: boolean[]) => 
          sum + steps.filter(Boolean).length, 0
        ) 
      : 0;
    
    const intensity = totalNotes > 20 ? "intense and energetic" : totalNotes > 10 ? "rhythmic and flowing" : "minimal and calm";
    const tempoDescription = tempo > 140 ? "fast and exciting" : tempo > 100 ? "upbeat and groovy" : "slow and relaxed";

    const prompt = `Create an abstract, artistic album cover for a beat called "${beatName}". The music uses ${instrumentList} at ${tempo} BPM. The vibe is ${intensity} and ${tempoDescription}. Style: vibrant colors, geometric patterns, music visualization, sound waves, abstract art. No text or words in the image. Ultra high resolution.`;

    console.log("Generating image with prompt:", prompt);

    // Call Lovable AI to generate image
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
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageBase64) {
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("No image generated");
    }

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract base64 data (remove data:image/png;base64, prefix)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const fileName = `beat-covers/${beatId}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from("app-assets")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("app-assets")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // Update the beat record with the image URL
    const { error: updateError } = await supabase
      .from("beat_pad_creations")
      .update({ image_url: imageUrl })
      .eq("id", beatId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error(`Failed to update beat: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, image_url: imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
