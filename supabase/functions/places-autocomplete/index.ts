import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

// Server-side Google Places (New) autocomplete + details for the event location box.
// The browser never talks to Google Places directly, so a Google failure can never
// lock or alter the manual location input.

const Body = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('autocomplete'),
    input: z.string().trim().min(2).max(200),
    sessionToken: z.string().uuid(),
  }),
  z.object({
    action: z.literal('details'),
    placeId: z.string().regex(/^[A-Za-z0-9_-]{10,300}$/),
    sessionToken: z.string().uuid(),
  }),
]);

// Bias suggestions to the Longmont / Front Range area instead of the server's IP.
const LOCATION_BIAS = {
  circle: { center: { latitude: 40.1672, longitude: -105.1019 }, radius: 50000 },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Unauthorized' }, 401);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401);

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const mapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!lovableKey || !mapsKey) return json({ error: 'Place suggestions are not configured' }, 503);
    const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps/places';
    const gw = { Authorization: `Bearer ${lovableKey}`, 'X-Connection-Api-Key': mapsKey };

    let response: Response;
    if (parsed.data.action === 'autocomplete') {
      response = await fetch(`${GATEWAY_URL}/v1/places:autocomplete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...gw,
          'X-Goog-FieldMask':
            'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat',
        },
        body: JSON.stringify({
          input: parsed.data.input,
          sessionToken: parsed.data.sessionToken,
          locationBias: LOCATION_BIAS,
        }),
      });
    } else {
      const url = new URL(`${GATEWAY_URL}/v1/places/${parsed.data.placeId}`);
      url.searchParams.set('sessionToken', parsed.data.sessionToken);
      response = await fetch(url, {
        headers: { ...gw, 'X-Goog-FieldMask': 'id,displayName,formattedAddress' },
      });
    }

    if (!response.ok) {
      const details = await response.text();
      console.error(`Google Places failed [${response.status}]: ${details}`);
      return json({ error: 'Google Places request failed', status: response.status, details }, 502);
    }

    const data = await response.json();
    if (parsed.data.action === 'autocomplete') {
      const suggestions = (data.suggestions ?? [])
        .map((s: any) => s.placePrediction)
        .filter((p: any) => p?.placeId)
        .slice(0, 5)
        .map((p: any) => ({
          placeId: p.placeId,
          text: p.text?.text ?? '',
          main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
          secondary: p.structuredFormat?.secondaryText?.text ?? '',
        }));
      return json({ suggestions });
    }
    const name: string = data.displayName?.text ?? '';
    const address: string = data.formattedAddress ?? '';
    // Keep the venue name when Google's address doesn't already include it.
    const value = name && address && !address.startsWith(name) ? `${name}, ${address}` : address || name;
    return json({ value });
  } catch (error) {
    console.error('places-autocomplete error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
