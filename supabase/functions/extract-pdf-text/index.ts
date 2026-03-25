import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdf_base64 } = await req.json();

    if (!pdf_base64) {
      return new Response(
        JSON.stringify({ error: "pdf_base64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // First try native extraction
    const binaryString = atob(pdf_base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const nativeText = extractTextFromPDF(bytes);
    
    // Quality check: does native extraction have enough email-like content?
    const emailCount = (nativeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).length;
    
    if (emailCount >= 3) {
      console.log(`Native extraction found ${emailCount} emails, using native result`);
      return new Response(
        JSON.stringify({ text: nativeText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: Use Lovable AI (Gemini) for OCR/extraction
    console.log(`Native extraction found only ${emailCount} emails, falling back to AI extraction`);
    
    const aiText = await extractWithAI(pdf_base64);
    
    if (aiText) {
      return new Response(
        JSON.stringify({ text: aiText }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If AI also failed, return whatever native got
    return new Response(
      JSON.stringify({ text: nativeText || "No text could be extracted from this PDF." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("PDF extraction error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function extractWithAI(pdf_base64: string): Promise<string | null> {
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not available for AI extraction");
      return null;
    }

    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract ALL names and email addresses from this PDF document. 
Return ONLY the data in this exact format, one entry per line:
Name<TAB>email@example.com

If there are headers like "Name" and "Email", skip those header rows.
Do not add any other text, explanations, or formatting. Just the name and email separated by a tab character on each line.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdf_base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      console.error("AI extraction failed:", response.status, await response.text());
      return null;
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content;
    
    if (text) {
      console.log(`AI extraction returned ${text.split('\n').length} lines`);
      return text.trim();
    }
    
    return null;
  } catch (error) {
    console.error("AI extraction error:", error);
    return null;
  }
}

function extractTextFromPDF(bytes: Uint8Array): string {
  const content = new TextDecoder("latin1").decode(bytes);
  const lines: string[] = [];

  const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch;

  while ((streamMatch = streamPattern.exec(content)) !== null) {
    const stream = streamMatch[1];

    const tjPattern = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjPattern.exec(stream)) !== null) {
      const text = decodePDFString(tjMatch[1]);
      if (text.trim()) lines.push(text.trim());
    }

    const tjArrayPattern = /\[((?:[^[\]]*|\[(?:[^[\]]*|\[[^[\]]*\])*\])*)\]\s*TJ/g;
    let tjArrayMatch;
    while ((tjArrayMatch = tjArrayPattern.exec(stream)) !== null) {
      const array = tjArrayMatch[1];
      let text = "";
      const itemPattern = /\(([^)]*)\)|(-?\d+(?:\.\d+)?)/g;
      let itemMatch;
      while ((itemMatch = itemPattern.exec(array)) !== null) {
        if (itemMatch[1] !== undefined) {
          text += decodePDFString(itemMatch[1]);
        } else if (itemMatch[2] !== undefined) {
          const kern = parseFloat(itemMatch[2]);
          if (kern < -100) text += " ";
        }
      }
      if (text.trim()) lines.push(text.trim());
    }
  }

  if (lines.length === 0) {
    const simplePattern = /\(([^)]{2,})\)/g;
    let simpleMatch;
    while ((simpleMatch = simplePattern.exec(content)) !== null) {
      const text = decodePDFString(simpleMatch[1]);
      if (text.trim() && text.length > 1 && (text.includes("@") || /^[A-Za-z\s]+$/.test(text.trim()))) {
        lines.push(text.trim());
      }
    }
  }

  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("@")) {
      if (i > 0 && !lines[i - 1].includes("@") && /^[A-Za-z\s]+$/.test(lines[i - 1])) {
        result.push(`${lines[i - 1]}\t${line}`);
      } else {
        result.push(line);
      }
    } else if (i < lines.length - 1 && lines[i + 1]?.includes("@")) {
      continue;
    } else if (/^[A-Za-z\s]+$/.test(line) && line.split(" ").length <= 4) {
      result.push(line);
    }
  }

  if (result.length > 0) {
    return result.join("\n");
  }

  return lines.join("\n");
}

function decodePDFString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}
