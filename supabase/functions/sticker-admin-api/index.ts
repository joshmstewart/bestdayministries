import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"] as const;

const COLLECTION_FIELDS = [
  "name", "description", "theme", "start_date", "end_date", "ga_date",
  "featured_start_date", "visible_to_roles", "stickers_per_pack",
  "rarity_percentages", "display_order", "is_active",
] as const;

const STICKER_FIELDS = [
  "collection_id", "name", "description", "rarity", "image_url",
  "visual_style", "drop_rate", "sticker_number", "is_active", "metadata",
] as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Constant-time string comparison (length-independent via SHA-256 hashing).
async function keysEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const ba = new Uint8Array(ha);
  const bb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}

function validateRarityPercentages(rp: unknown): string | null {
  if (typeof rp !== "object" || rp === null || Array.isArray(rp)) {
    return "rarity_percentages must be an object";
  }
  const entries = Object.entries(rp as Record<string, unknown>);
  for (const [k, v] of entries) {
    if (!(RARITIES as readonly string[]).includes(k)) {
      return `rarity_percentages has unknown rarity "${k}"`;
    }
    if (typeof v !== "number" || v < 0) {
      return `rarity_percentages.${k} must be a non-negative number`;
    }
  }
  const sum = entries.reduce((s, [, v]) => s + (v as number), 0);
  if (Math.abs(sum - 100) > 0.0001) {
    return `rarity_percentages must sum to 100 (got ${sum})`;
  }
  return null;
}

function pickFields(source: Record<string, unknown>, allowed: readonly string[]) {
  const out: Record<string, unknown> = {};
  const unknown: string[] = [];
  for (const [k, v] of Object.entries(source)) {
    if (allowed.includes(k)) out[k] = v;
    else unknown.push(k);
  }
  return { out, unknown };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Auth: shared admin key, constant-time compare ---
    const expected = Deno.env.get("STICKER_ADMIN_KEY");
    if (!expected) {
      console.error("STICKER_ADMIN_KEY is not configured");
      return json({ ok: false, error: "Server not configured" }, 500);
    }
    const provided = req.headers.get("x-sticker-admin-key") ?? "";
    if (!provided || !(await keysEqual(provided, expected))) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const body = await req.json().catch(() => null);
    if (!body || typeof body.action !== "string") {
      return json({ ok: false, error: "Body must be JSON with an action field" }, 400);
    }
    const { action } = body;

    const log = async (detail: Record<string, unknown>) => {
      const { error } = await supabase.from("sticker_admin_log").insert({
        action,
        collection_id: detail.collection_id ?? null,
        sticker_id: detail.sticker_id ?? null,
        detail,
      });
      if (error) console.error("log insert failed:", error.message);
    };

    switch (action) {
      case "list_collections": {
        const { data, error } = await supabase
          .from("sticker_collections")
          .select("*")
          .order("display_order", { ascending: true });
        if (error) throw error;
        return json({ ok: true, data });
      }

      case "get_collection": {
        const { collection_id } = body;
        if (!collection_id) return json({ ok: false, error: "collection_id required" }, 400);
        const { data: collection, error: cErr } = await supabase
          .from("sticker_collections")
          .select("*")
          .eq("id", collection_id)
          .maybeSingle();
        if (cErr) throw cErr;
        if (!collection) return json({ ok: false, error: "Collection not found" }, 404);
        const { data: stickers, error: sErr } = await supabase
          .from("stickers")
          .select("*")
          .eq("collection_id", collection_id)
          .order("sticker_number", { ascending: true });
        if (sErr) throw sErr;
        return json({ ok: true, data: { ...collection, stickers } });
      }

      case "create_collection": {
        const { out, unknown } = pickFields(body, [...COLLECTION_FIELDS, "action"]);
        if (unknown.length) {
          return json({ ok: false, error: `Unknown fields: ${unknown.join(", ")}` }, 400);
        }
        for (const reqField of ["name", "theme", "start_date", "stickers_per_pack", "rarity_percentages"]) {
          if (out[reqField] === undefined) {
            return json({ ok: false, error: `${reqField} is required` }, 400);
          }
        }
        const rpErr = validateRarityPercentages(out.rarity_percentages);
        if (rpErr) return json({ ok: false, error: rpErr }, 400);

        const insert = {
          ...out,
          use_default_rarity: false,
          is_active: false, // never go live by accident
        };
        const { data, error } = await supabase
          .from("sticker_collections")
          .insert(insert)
          .select()
          .single();
        if (error) throw error;
        await log({ collection_id: data.id, name: data.name });
        return json({ ok: true, data });
      }

      case "update_collection": {
        const { collection_id, ...rest } = body;
        if (!collection_id) return json({ ok: false, error: "collection_id required" }, 400);
        const { out, unknown } = pickFields(rest, COLLECTION_FIELDS);
        if (unknown.length) {
          return json({ ok: false, error: `Unknown fields: ${unknown.join(", ")}` }, 400);
        }
        if (out.rarity_percentages !== undefined) {
          const rpErr = validateRarityPercentages(out.rarity_percentages);
          if (rpErr) return json({ ok: false, error: rpErr }, 400);
        }
        if (Object.keys(out).length === 0) {
          return json({ ok: false, error: "No fields to update" }, 400);
        }
        const { data, error } = await supabase
          .from("sticker_collections")
          .update(out)
          .eq("id", collection_id)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (!data) return json({ ok: false, error: "Collection not found" }, 404);
        await log({ collection_id, fields: Object.keys(out) });
        return json({ ok: true, data });
      }

      case "upload_image": {
        const { path, content_type, base64 } = body;
        if (!path || !content_type || !base64) {
          return json({ ok: false, error: "path, content_type and base64 are required" }, 400);
        }
        if (typeof path !== "string" || path.includes("..") || path.startsWith("/")) {
          return json({ ok: false, error: "Invalid path" }, 400);
        }
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const storagePath = `generator/${path}`;
        const { error: upErr } = await supabase.storage
          .from("sticker-images")
          .upload(storagePath, bytes, { contentType: content_type, upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from("sticker-images")
          .getPublicUrl(storagePath);
        const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;
        await log({ path: storagePath, content_type });
        return json({ ok: true, data: { url: publicUrl, path: storagePath } });
      }

      case "set_pack_image": {
        const { collection_id, image_url } = body;
        if (!collection_id || !image_url) {
          return json({ ok: false, error: "collection_id and image_url are required" }, 400);
        }
        const { data, error } = await supabase
          .from("sticker_collections")
          .update({ pack_image_url: image_url })
          .eq("id", collection_id)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (!data) return json({ ok: false, error: "Collection not found" }, 404);
        await log({ collection_id, image_url });
        return json({ ok: true, data });
      }

      case "create_sticker": {
        const { out, unknown } = pickFields(body, [...STICKER_FIELDS, "action"]);
        if (unknown.length) {
          return json({ ok: false, error: `Unknown fields: ${unknown.join(", ")}` }, 400);
        }
        for (const reqField of ["collection_id", "name", "rarity", "image_url", "visual_style", "drop_rate", "sticker_number"]) {
          if (out[reqField] === undefined) {
            return json({ ok: false, error: `${reqField} is required` }, 400);
          }
        }
        if (!(RARITIES as readonly string[]).includes(out.rarity as string)) {
          return json({ ok: false, error: `rarity must be one of: ${RARITIES.join(", ")}` }, 400);
        }
        const { data, error } = await supabase
          .from("stickers")
          .insert(out)
          .select()
          .single();
        if (error) throw error;
        await log({ collection_id: data.collection_id, sticker_id: data.id, name: data.name });
        return json({ ok: true, data });
      }

      case "update_sticker": {
        const { sticker_id, ...rest } = body;
        if (!sticker_id) return json({ ok: false, error: "sticker_id required" }, 400);
        const { out, unknown } = pickFields(rest, STICKER_FIELDS);
        if (unknown.length) {
          return json({ ok: false, error: `Unknown fields: ${unknown.join(", ")}` }, 400);
        }
        if (out.rarity !== undefined && !(RARITIES as readonly string[]).includes(out.rarity as string)) {
          return json({ ok: false, error: `rarity must be one of: ${RARITIES.join(", ")}` }, 400);
        }
        if (Object.keys(out).length === 0) {
          return json({ ok: false, error: "No fields to update" }, 400);
        }
        const { data, error } = await supabase
          .from("stickers")
          .update(out)
          .eq("id", sticker_id)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (!data) return json({ ok: false, error: "Sticker not found" }, 404);
        await log({ sticker_id, collection_id: data.collection_id, fields: Object.keys(out) });
        return json({ ok: true, data });
      }

      case "delete_sticker": {
        const { sticker_id } = body;
        if (!sticker_id) return json({ ok: false, error: "sticker_id required" }, 400);
        const { count, error: cErr } = await supabase
          .from("user_stickers")
          .select("id", { count: "exact", head: true })
          .eq("sticker_id", sticker_id);
        if (cErr) throw cErr;
        if ((count ?? 0) > 0) {
          return json({
            ok: false,
            error: `Sticker is owned by ${count} user(s); use update_sticker {is_active: false} instead so nobody's collection loses a card`,
          }, 409);
        }
        const { error } = await supabase.from("stickers").delete().eq("id", sticker_id);
        if (error) throw error;
        await log({ sticker_id });
        return json({ ok: true, data: { deleted: sticker_id } });
      }

      case "delete_collection": {
        const { collection_id } = body;
        if (!collection_id) return json({ ok: false, error: "collection_id required" }, 400);
        const { data: stickers, error: sErr } = await supabase
          .from("stickers")
          .select("id")
          .eq("collection_id", collection_id);
        if (sErr) throw sErr;
        const ids = (stickers ?? []).map((s) => s.id);
        if (ids.length > 0) {
          const { count, error: cErr } = await supabase
            .from("user_stickers")
            .select("id", { count: "exact", head: true })
            .in("sticker_id", ids);
          if (cErr) throw cErr;
          if ((count ?? 0) > 0) {
            return json({
              ok: false,
              error: `Collection has ${count} sticker(s) owned by users; refuse to delete. Deactivate it instead.`,
            }, 409);
          }
          const { error: dErr } = await supabase.from("stickers").delete().in("id", ids);
          if (dErr) throw dErr;
        }
        const { error } = await supabase
          .from("sticker_collections")
          .delete()
          .eq("id", collection_id);
        if (error) throw error;
        await log({ collection_id, deleted_stickers: ids.length });
        return json({ ok: true, data: { deleted: collection_id, deleted_stickers: ids.length } });
      }

      default:
        return json({ ok: false, error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error("sticker-admin-api error:", error);
    return json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
