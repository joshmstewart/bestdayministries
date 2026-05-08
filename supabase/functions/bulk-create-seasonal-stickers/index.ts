// Bulk-generate seasonal stickers via Lovable AI Gateway, upload to storage, insert sticker rows.
// Designed to be called repeatedly with small batch sizes to stay under the edge timeout.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StickerSpec {
  name: string;
  description: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  prompt: string;
}

interface ReqBody {
  collection_id: string;
  stickers: StickerSpec[];
  start_index?: number; // sticker_number offset (defaults to next available)
  batch_size?: number;  // default 6
  offset?: number;      // index into stickers[] to start from
}

const RARITY_VISUAL: Record<string, string> = {
  common: "simple flat illustration, soft natural colors",
  uncommon: "vibrant illustration with subtle shading and a small accent",
  rare: "detailed illustration with rich colors, soft glow",
  epic: "ornate illustration with shimmering highlights and decorative flourishes",
  legendary: "masterpiece illustration, golden glow, sparkling magical aura, intricate detail",
};

async function generateImage(prompt: string, apiKey: string): Promise<Uint8Array> {
  const fullPrompt = `${prompt}. Cute kawaii sticker style, thick clean white outline, isolated on a pure solid white background (#FFFFFF), centered, square 1:1 framing, no text, no watermark, no shadow, vibrant cheerful colors, suitable for a kids/family sticker album.`;
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: fullPrompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI ${resp.status}: ${t.slice(0, 300)}`);
  }
  const data = await resp.json();
  const url: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url || !url.startsWith("data:")) throw new Error("No image returned");
  const b64 = url.split(",")[1];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = (await req.json()) as ReqBody;
    const { collection_id, stickers } = body;
    if (!collection_id || !Array.isArray(stickers) || stickers.length === 0) {
      return new Response(JSON.stringify({ error: "collection_id and stickers required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const offset = body.offset ?? 0;
    const batchSize = Math.min(body.batch_size ?? 6, 10);

    // Determine starting sticker_number
    let startNumber = body.start_index;
    if (startNumber == null) {
      const { data: maxRow } = await supabase
        .from("stickers")
        .select("sticker_number")
        .eq("collection_id", collection_id)
        .order("sticker_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      startNumber = (maxRow?.sticker_number ?? 0) + 1;
    }

    const slice = stickers.slice(offset, offset + batchSize);
    const results: any[] = [];

    for (let i = 0; i < slice.length; i++) {
      const spec = slice[i];
      const stickerNumber = startNumber + offset + i;
      try {
        const fullPrompt = `${spec.prompt}, ${RARITY_VISUAL[spec.rarity] ?? ""}`;
        const bytes = await generateImage(fullPrompt, LOVABLE_API_KEY);
        const filename = `${crypto.randomUUID()}.png`;
        const { error: upErr } = await supabase.storage
          .from("sticker-images")
          .upload(filename, bytes, { contentType: "image/png", upsert: false });
        if (upErr) throw new Error(`upload: ${upErr.message}`);
        const { data: pub } = supabase.storage.from("sticker-images").getPublicUrl(filename);

        const { error: insErr } = await supabase.from("stickers").insert({
          collection_id,
          name: spec.name,
          description: spec.description,
          rarity: spec.rarity,
          image_url: pub.publicUrl,
          sticker_number: stickerNumber,
          is_active: true,
          visual_style: RARITY_VISUAL[spec.rarity] ?? "kawaii sticker illustration",
        });
        if (insErr) throw new Error(`insert: ${insErr.message}`);
        results.push({ ok: true, name: spec.name, sticker_number: stickerNumber, image_url: pub.publicUrl });
      } catch (e) {
        results.push({ ok: false, name: spec.name, error: String(e instanceof Error ? e.message : e) });
      }
    }

    const nextOffset = offset + slice.length;
    const done = nextOffset >= stickers.length;
    return new Response(
      JSON.stringify({ processed: slice.length, next_offset: nextOffset, done, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("bulk-create-seasonal-stickers error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
