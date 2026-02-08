import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SITE_URL } from "../_shared/domainConstants.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MetaTagsRequest {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  eventId?: string;
  newsletterId?: string;
  redirect?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Support both JSON body and URL query params
    let params: MetaTagsRequest = { url: '' };
    
    const urlObj = new URL(req.url);
    const eventId = urlObj.searchParams.get('eventId');
    const newsletterId = urlObj.searchParams.get('newsletterId');
    const redirect = urlObj.searchParams.get('redirect');
    
    if (req.method === 'GET' && (eventId || newsletterId || redirect)) {
      params = {
        url: redirect || urlObj.searchParams.get('url') || '',
        eventId: eventId || undefined,
        newsletterId: newsletterId || undefined,
        redirect: redirect || undefined,
      };
    } else {
      params = await req.json() as MetaTagsRequest;
    }

    const { url, title, description, image, type = 'website' } = params;

    // Load SEO settings from database
    const { data: settings } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['site_title', 'site_description', 'og_image_url', 'twitter_handle']);

    const settingsMap: Record<string, any> = {};
    settings?.forEach((setting) => {
      try {
        settingsMap[setting.setting_key] = 
          typeof setting.setting_value === 'string' 
            ? JSON.parse(setting.setting_value) 
            : setting.setting_value;
      } catch {
        settingsMap[setting.setting_key] = setting.setting_value;
      }
    });

    let finalTitle = title || settingsMap.site_title || 'Joy House Community';
    let finalDescription = description || settingsMap.site_description || 'Building a supportive community for adults with special needs';
    let finalImage = image || settingsMap.og_image_url || 'https://lovable.dev/opengraph-image-p98pqg.png';
    let finalType = type;
    let finalUrl = url;
    const twitterHandle = settingsMap.twitter_handle || '';

    // Fetch event data if eventId is provided
    if (params.eventId) {
      const { data: event } = await supabase
        .from('events')
        .select('id, title, description, image_url, event_date, location')
        .eq('id', params.eventId)
        .single();

      if (event) {
        finalTitle = event.title;
        finalDescription = event.description || finalDescription;
        finalImage = event.image_url || finalImage;
        finalType = 'article';
        finalUrl = params.redirect || `${SITE_URL}/community?tab=feed&eventId=${event.id}`;
      }
    }

    // Fetch newsletter data if newsletterId is provided
    if (params.newsletterId) {
      const { data: newsletter } = await supabase
        .from('newsletter_campaigns')
        .select('id, title, subject, preview_text, sent_at')
        .eq('id', params.newsletterId)
        .eq('status', 'sent')
        .single();

      if (newsletter) {
        finalTitle = newsletter.title || newsletter.subject;
        finalDescription = newsletter.preview_text || finalDescription;
        finalType = 'article';
        finalUrl = params.redirect || `${SITE_URL}/newsletters/${newsletter.id}`;
      }
    }

    // Generate HTML with meta tags
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${finalTitle}</title>
  <meta name="description" content="${finalDescription}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${finalTitle}">
  <meta property="og:description" content="${finalDescription}">
  <meta property="og:type" content="${finalType}">
  <meta property="og:image" content="${finalImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${finalUrl}">
  <meta property="og:site_name" content="Joy House Community">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${finalTitle}">
  <meta name="twitter:description" content="${finalDescription}">
  <meta name="twitter:image" content="${finalImage}">
  ${twitterHandle ? `<meta name="twitter:site" content="@${twitterHandle}">` : ''}
  
  <!-- Canonical -->
  <link rel="canonical" href="${finalUrl}">
  
  <!-- Redirect to actual page -->
  <meta http-equiv="refresh" content="0; url=${finalUrl}">
  <script>window.location.href = "${finalUrl}";</script>
</head>
<body>
  <p>Redirecting to <a href="${finalUrl}">${finalUrl}</a>...</p>
</body>
</html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating meta tags:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});