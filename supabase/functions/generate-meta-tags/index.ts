import { createClient } from 'npm:@supabase/supabase-js@2.58.0'

const SITE_URL = 'https://bestdayministries.org'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const urlObj = new URL(req.url)
    const eventId = urlObj.searchParams.get('eventId')
    const newsletterId = urlObj.searchParams.get('newsletterId')
    const redirect = urlObj.searchParams.get('redirect')

    // Load SEO settings from database
    const { data: settings } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['site_title', 'site_description', 'og_image_url', 'twitter_handle'])

    const settingsMap: Record<string, string> = {}
    settings?.forEach((s: any) => {
      try {
        settingsMap[s.setting_key] = typeof s.setting_value === 'string' ? JSON.parse(s.setting_value) : s.setting_value
      } catch {
        settingsMap[s.setting_key] = s.setting_value
      }
    })

    let finalTitle = settingsMap.site_title || 'Joy House Community'
    let finalDescription = settingsMap.site_description || 'Building a supportive community for adults with special needs'
    let finalImage = settingsMap.og_image_url || 'https://lovable.dev/opengraph-image-p98pqg.png'
    let finalType = 'website'
    let finalUrl = redirect || urlObj.searchParams.get('url') || SITE_URL

    // Fetch event data if eventId is provided
    if (eventId) {
      const { data: event } = await supabase
        .from('events')
        .select('id, title, description, image_url')
        .eq('id', eventId)
        .single()

      if (event) {
        finalTitle = event.title
        finalDescription = event.description || finalDescription
        finalImage = event.image_url || finalImage
        finalType = 'article'
        finalUrl = redirect || `${SITE_URL}/community?tab=feed&eventId=${event.id}`
      }
    }

    // Fetch newsletter data if newsletterId is provided
    if (newsletterId) {
      const { data: newsletter } = await supabase
        .from('newsletter_campaigns')
        .select('id, title, display_name, display_image_url, subject, preview_text')
        .eq('id', newsletterId)
        .eq('status', 'sent')
        .single()

      if (newsletter) {
        finalTitle = newsletter.display_name || newsletter.title || newsletter.subject
        finalDescription = newsletter.preview_text || finalDescription
        if (newsletter.display_image_url) finalImage = newsletter.display_image_url
        finalType = 'article'
        finalUrl = redirect || `${SITE_URL}/newsletters/${newsletter.id}`
      }
    }

    const twitterHandle = settingsMap.twitter_handle || ''

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${finalTitle}</title>
  <meta name="description" content="${finalDescription}">
  <meta property="og:title" content="${finalTitle}">
  <meta property="og:description" content="${finalDescription}">
  <meta property="og:type" content="${finalType}">
  <meta property="og:image" content="${finalImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${finalUrl}">
  <meta property="og:site_name" content="Joy House Community">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${finalTitle}">
  <meta name="twitter:description" content="${finalDescription}">
  <meta name="twitter:image" content="${finalImage}">
  ${twitterHandle ? `<meta name="twitter:site" content="@${twitterHandle}">` : ''}
  <link rel="canonical" href="${finalUrl}">
  <script>window.location.replace("${finalUrl}");</script>
  <noscript><meta http-equiv="refresh" content="0; url=${finalUrl}"></noscript>
</head>
<body>
  <p>Redirecting to <a href="${finalUrl}">${finalUrl}</a>...</p>
</body>
</html>`

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    })
  } catch (error) {
    console.error('Error generating meta tags:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
