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

    // Decode base64 to binary
    const binaryString = atob(pdf_base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Simple PDF text extraction - parse the PDF content streams
    const pdfText = extractTextFromPDF(bytes);

    return new Response(
      JSON.stringify({ text: pdfText }),
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

function extractTextFromPDF(bytes: Uint8Array): string {
  const content = new TextDecoder("latin1").decode(bytes);
  const lines: string[] = [];

  // Find all text streams between BT and ET markers
  const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch;

  while ((streamMatch = streamPattern.exec(content)) !== null) {
    const stream = streamMatch[1];

    // Extract text from Tj and TJ operators
    // Tj = show text string
    const tjPattern = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjPattern.exec(stream)) !== null) {
      const text = decodePDFString(tjMatch[1]);
      if (text.trim()) lines.push(text.trim());
    }

    // TJ = show text array
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
          // Large negative kerning typically means a space
          if (kern < -100) text += " ";
        }
      }
      if (text.trim()) lines.push(text.trim());
    }
  }

  // If stream extraction found nothing, try a simpler approach for text-based PDFs
  if (lines.length === 0) {
    // Look for text between parentheses near Tj/TJ operators anywhere
    const simplePattern = /\(([^)]{2,})\)/g;
    let simpleMatch;
    while ((simpleMatch = simplePattern.exec(content)) !== null) {
      const text = decodePDFString(simpleMatch[1]);
      if (text.trim() && text.length > 1 && text.includes("@") || /^[A-Za-z\s]+$/.test(text.trim())) {
        lines.push(text.trim());
      }
    }
  }

  // Try to pair names and emails by proximity
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("@")) {
      // Check if previous line is a name
      if (i > 0 && !lines[i - 1].includes("@") && /^[A-Za-z\s]+$/.test(lines[i - 1])) {
        result.push(`${lines[i - 1]}\t${line}`);
      } else {
        result.push(line);
      }
    } else if (i < lines.length - 1 && lines[i + 1]?.includes("@")) {
      // Name before email — skip, will be paired on next iteration
      continue;
    } else if (/^[A-Za-z\s]+$/.test(line) && line.split(" ").length <= 4) {
      // Standalone name — add as-is, might be useful
      result.push(line);
    }
  }

  // If we got paired results, use those; otherwise return raw lines
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
