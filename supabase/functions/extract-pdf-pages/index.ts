import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfUrl } = await req.json();

    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ error: "PDF URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing PDF:", pdfUrl);

    // Fetch the PDF
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
    }
    
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfBuffer);

    // Use Lovable AI to extract/convert PDF pages to images
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Convert PDF bytes to base64 for processing
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));

    // Use the AI model to process the PDF and extract pages as images
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
            content: [
              {
                type: "text",
                text: "This is a PDF containing coloring pages. Please extract each page as a separate black and white line art image. Return each page as a clean, high-contrast black and white image suitable for coloring. Preserve all the line work exactly as it appears."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      // Fallback: If the AI can't process PDF directly, we'll need a different approach
      // For now, let's try to upload the first page as an image conversion
      throw new Error("PDF processing not directly supported. Please upload image files instead.");
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract images from the response
    const images: string[] = [];
    const message = data.choices?.[0]?.message;
    
    if (message?.images && Array.isArray(message.images)) {
      // Upload each extracted image to storage
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      for (let i = 0; i < message.images.length; i++) {
        const imageData = message.images[i];
        const imageUrl = imageData.image_url?.url;
        
        if (imageUrl && imageUrl.startsWith("data:image")) {
          // Extract base64 data
          const base64Match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
          if (base64Match) {
            const [, format, base64Data] = base64Match;
            const binaryStr = atob(base64Data);
            const bytes = new Uint8Array(binaryStr.length);
            for (let j = 0; j < binaryStr.length; j++) {
              bytes[j] = binaryStr.charCodeAt(j);
            }

            const fileName = `coloring-pages/pdf-extract-${Date.now()}-${i + 1}.${format === "jpeg" ? "jpg" : format}`;
            const { error: uploadError } = await supabase.storage
              .from("app-assets")
              .upload(fileName, bytes, {
                contentType: `image/${format}`,
              });

            if (uploadError) {
              console.error("Upload error for page", i + 1, uploadError);
              continue;
            }

            const { data: urlData } = supabase.storage
              .from("app-assets")
              .getPublicUrl(fileName);
            
            images.push(urlData.publicUrl);
          }
        }
      }
    }

    if (images.length === 0) {
      throw new Error("Could not extract any pages from the PDF. Please try uploading individual image files instead.");
    }

    console.log(`Successfully extracted ${images.length} pages`);

    return new Response(
      JSON.stringify({ pages: images }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to process PDF";
    console.error("Error processing PDF:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
