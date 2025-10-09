import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetaTagsRequest {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  type?: string;
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

    const { url, title, description, image, type = 'website' } = await req.json() as MetaTagsRequest;

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

    const finalTitle = title || settingsMap.site_title || 'Joy House Community';
    const finalDescription = description || settingsMap.site_description || 'Building a supportive community for adults with special needs';
    const finalImage = image || settingsMap.og_image_url || 'https://lovable.dev/opengraph-image-p98pqg.png';
    const twitterHandle = settingsMap.twitter_handle || '';

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
  <meta property="og:type" content="${type}">
  <meta property="og:image" content="${finalImage}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="Joy House Community">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${finalTitle}">
  <meta name="twitter:description" content="${finalDescription}">
  <meta name="twitter:image" content="${finalImage}">
  ${twitterHandle ? `<meta name="twitter:site" content="@${twitterHandle}">` : ''}
  
  <!-- Canonical -->
  <link rel="canonical" href="${url}">
  
  <!-- Redirect to actual page -->
  <meta http-equiv="refresh" content="0; url=${url}">
  <script>window.location.href = "${url}";</script>
</head>
<body>
  <p>Redirecting to <a href="${url}">${url}</a>...</p>
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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});