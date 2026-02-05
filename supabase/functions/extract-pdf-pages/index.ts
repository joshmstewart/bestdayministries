import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pdfLib from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Load the PDF document
    const pdfDoc = await pdfLib.PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();
    
    console.log(`PDF has ${pageCount} pages`);

    if (pageCount === 0) {
      throw new Error("PDF has no pages");
    }

    // Limit to 50 pages for safety
    const maxPages = Math.min(pageCount, 50);

    // Use Lovable AI to convert each PDF page to a clean coloring page image
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const extractedPages: string[] = [];

    // Process each page by creating a single-page PDF and converting it
    for (let i = 0; i < maxPages; i++) {
      console.log(`Processing page ${i + 1} of ${maxPages}`);
      
      try {
        // Create a new PDF with just this page
        const singlePagePdf = await pdfLib.PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [i]);
        singlePagePdf.addPage(copiedPage);
        const singlePageBytes = await singlePagePdf.save();
        
        // Convert single page PDF to base64
        const singlePageBase64 = btoa(String.fromCharCode(...singlePageBytes));

        // Use AI to convert the PDF page to a clean black and white image
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
                    text: "Convert this PDF page to a high-quality black and white line art image. This is a coloring page. Keep all lines clean and crisp. The output should be a pure black and white image with clean outlines suitable for coloring. Do not add any shading or fill any areas. Just preserve the line art exactly as shown."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:application/pdf;base64,${singlePageBase64}`
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
          console.error(`AI API error for page ${i + 1}:`, response.status, errorText);
          continue;
        }

        const data = await response.json();
        const message = data.choices?.[0]?.message;
        
        if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
          const imageData = message.images[0];
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

              const fileName = `coloring-pages/pdf-extract-${Date.now()}-page-${i + 1}.${format === "jpeg" ? "jpg" : format}`;
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
              
              extractedPages.push(urlData.publicUrl);
              console.log(`Successfully extracted page ${i + 1}`);
            }
          }
        }
      } catch (pageError) {
        console.error(`Error processing page ${i + 1}:`, pageError);
        // Continue to next page
      }
    }

    if (extractedPages.length === 0) {
      throw new Error("Could not extract any pages from the PDF. The AI model may not support this PDF format. Please try uploading individual image files instead.");
    }

    console.log(`Successfully extracted ${extractedPages.length} of ${maxPages} pages`);

    return new Response(
      JSON.stringify({ pages: extractedPages }),
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
