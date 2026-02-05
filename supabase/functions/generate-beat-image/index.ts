import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Massive variety of album art styles spanning eras, cultures, and aesthetics
    const artStyles = [
      // Classic design movements
      "minimalist design with bold typography shapes, negative space, Swiss design influence",
      "art deco geometric patterns, gold and black, 1920s glamour, ornate borders",
      "bauhaus design, primary colors, geometric shapes, functional aesthetic",
      "art nouveau flowing organic lines, floral motifs, elegant curves",
      "brutalist design, raw concrete textures, stark angular shapes, industrial",
      "Memphis design 1980s, bold geometric shapes, squiggles, bright clashing colors",
      "constructivist bold angles, red and black, propaganda poster style",
      "de stijl Mondrian-inspired primary colors, black grid lines, blocks",
      
      // Vintage eras
      "vintage 1950s atomic age, starburst shapes, boomerang patterns, retro futurism",
      "1960s mod design, op-art patterns, bold geometric, go-go aesthetic",
      "vintage 1970s psychedelic rock poster style, swirling patterns, warm earthy tones",
      "1970s disco era, mirror balls, gold lamé textures, glitter and glamour",
      "80s synthwave, neon grids, chrome text effects, sunset gradients purple pink",
      "90s grunge aesthetic, distressed textures, muted colors, raw and gritty",
      "Y2K aesthetic, chrome bubbles, iMac colors, futuristic optimism",
      "vintage jazz album cover, smoky atmosphere, silhouettes, blue tones",
      "1940s big band era, art deco influence, sophisticated elegance",
      
      // Digital and modern
      "vaporwave aesthetic, pink and cyan gradients, Greek statues, palm trees, retro computer graphics",
      "glitch art, digital corruption, RGB splits, distorted imagery, databending",
      "pixel art retro gaming aesthetic, 8-bit style, limited color palette",
      "low poly 3D geometric landscapes, crystalline forms, gradient skies",
      "holographic iridescent textures, rainbow chrome, liquid metal",
      "cyberpunk neon cityscapes, rain reflections, high tech low life",
      "flat vector illustration, bold shapes, limited color palette, modern",
      "isometric 3D illustration, perfect angles, soft shadows",
      "gradient mesh smooth transitions, blurred organic shapes, aurora colors",
      "duotone photography, two bold contrasting colors, dramatic effect",
      
      // Fine art styles
      "oil painting classical style, rich textures, dramatic chiaroscuro lighting",
      "watercolor painting style, soft bleeding edges, pastel dreamlike quality",
      "impressionist painting style, visible brushstrokes, light and color focus",
      "expressionist bold brushstrokes, emotional color, distorted forms",
      "pointillism tiny dots of color, stippled texture, vibrant",
      "surrealist dreamscape like Dalí, melting forms, impossible architecture",
      "pop art style like Warhol, bold primary colors, comic dots, repetition",
      "abstract expressionist gestural marks, drips, emotional intensity",
      "cubist fragmented perspectives, geometric facets, multiple viewpoints",
      "fauvism wild bold colors, simplified forms, pure pigments",
      
      // Cultural and traditional
      "Japanese ukiyo-e woodblock print aesthetic, flowing lines, muted traditional colors",
      "Chinese ink wash painting, flowing brushwork, mountains and mist",
      "Persian miniature art, intricate patterns, gold leaf, jewel tones",
      "African tribal art, bold geometric patterns, earth tones, masks",
      "Mexican folk art, bright colors, papel picado, Day of Dead influence",
      "Indian rangoli patterns, symmetric mandalas, vibrant colors",
      "Aboriginal dot painting, dreamtime symbols, earthy ochres",
      "Moroccan zellige tiles, geometric star patterns, blue and white",
      "Nordic folk art rosemaling, flowing floral, traditional motifs",
      "Native American beadwork patterns, geometric, earth and sky colors",
      
      // Photography and realism
      "stark black and white photography with high contrast, moody shadows",
      "nature photography macro shot, extreme detail, organic textures",
      "long exposure light painting, trails of color, movement captured",
      "infrared photography, dreamy white foliage, surreal landscapes",
      "cinematic film still, anamorphic lens flare, movie lighting",
      "polaroid aesthetic, faded colors, vintage instant photo look",
      "double exposure photography, overlapping images, ethereal blend",
      "night photography, city lights bokeh, deep blues and warm glows",
      
      // Urban and street
      "street art and graffiti style, spray paint textures, urban grit",
      "sticker bomb collage, overlapping decals, chaotic energy",
      "wheat paste poster art, torn edges, layered urban decay",
      "neon sign typography, glowing tubes, dive bar aesthetic",
      "record crate digging aesthetic, worn vinyl, vintage music shop",
      
      // Nature and organic
      "bioluminescent deep sea, glowing creatures, dark ocean depths",
      "cosmic nebula space imagery, stars and gas clouds, galactic",
      "crystal formations, geometric minerals, prismatic light",
      "botanical illustration, scientific accuracy, vintage textbook style",
      "topographic map contours, elevation lines, earthy tones",
      "aurora borealis night sky, dancing lights, arctic landscape",
      "microscopic cellular imagery, organic patterns, scientific beauty",
      
      // Dark and moody
      "gothic dark romantic, ornate frames, roses, deep reds and blacks",
      "dark academia aesthetic, old books, candlelight, scholarly mystery",
      "film noir shadows, venetian blinds light, mysterious atmosphere",
      "occult mysticism, esoteric symbols, ancient knowledge aesthetic",
      "haunted vintage photograph, spectral figures, aged sepia tones",
      
      // Playful and whimsical
      "kawaii cute Japanese style, pastel colors, adorable characters",
      "Lisa Frank rainbow explosion, neon gradients, dolphins and unicorns",
      "cartoon network style, bold outlines, bright saturated colors",
      "psychedelic mushroom wonderland, trippy patterns, rainbow spiral",
      "candy and sweets aesthetic, glossy surfaces, sugar colors",
      "hot wheels racing aesthetic, flame decals, chrome and speed",
      
      // Futuristic
      "sci-fi concept art, futuristic landscapes, cosmic themes",
      "retro futurism Syd Mead style, sleek vehicles, utopian cities",
      "biomechanical HR Giger inspired, organic machinery, dark fusion",
      "solarpunk green future, plants and technology, hopeful utopia",
      "space opera epic, starships, alien planets, galactic adventure",
      
      // Texture focused
      "marble and stone textures, veined patterns, luxury materials",
      "rust and patina, aged metal, industrial decay, warm oxidation",
      "fabric and textile patterns, woven textures, fashion inspiration",
      "paper craft origami, folded geometric, dimensional shadows",
      "collage art, cut paper textures, mixed media, vintage magazine clippings",
      
      // Regional album art styles
      "Detroit techno aesthetic, industrial machinery, minimal and hard",
      "UK garage and jungle, futuristic chrome, speed blur",
      "Jamaican dancehall, tropical colors, sound system culture",
      "Brazilian tropicália, psychedelic tropical, cultural fusion",
      "Berlin techno, concrete brutalism, minimal industrial"
    ];
    
    // Use multiple factors for variety: beat name, tempo, notes, and random timestamp element
    const timestamp = Date.now();
    const hashValue = beatName.split('').reduce((acc: number, char: string) => 
      ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0
    );
    const styleIndex = Math.abs(hashValue + totalNotes * 7 + tempo * 13 + (timestamp % 1000)) % artStyles.length;
    const selectedStyle = artStyles[styleIndex];

    const prompt = `Create album cover art for a beat called "${beatName}". The music uses ${instrumentList} at ${tempo} BPM, feeling ${intensity} and ${tempoDescription}. Art style: ${selectedStyle}. Create a cohesive artistic composition that evokes the music's mood. No text, words, or letters in the image. Ultra high resolution.`;

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
      JSON.stringify({
        success: true,
        imageUrl: imageUrl,
        image_url: imageUrl,
      }),
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
