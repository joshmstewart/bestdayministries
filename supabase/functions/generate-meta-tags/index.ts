// Social sharing meta tags proxy — v2
const SITE_URL = 'https://bestdayministries.org'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function querySupabase(table: string, params: string): Promise<any[]> {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const res = await fetch(`${url}/rest/v1/${table}?${params}`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) return []
  return await res.json()
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const urlObj = new URL(req.url)
    const eventId = urlObj.searchParams.get('eventId')
    const newsletterId = urlObj.searchParams.get('newsletterId')
    const pageId = urlObj.searchParams.get('pageId')
    const redirect = urlObj.searchParams.get('redirect')

    // Load SEO settings
    const settings = await querySupabase(
      'app_settings',
      'select=setting_key,setting_value&setting_key=in.(site_title,site_description,og_image_url,twitter_handle)'
    )

    const settingsMap: Record<string, string> = {}
    for (const s of settings) {
      try {
        settingsMap[s.setting_key] = typeof s.setting_value === 'string' ? JSON.parse(s.setting_value) : s.setting_value
      } catch {
        settingsMap[s.setting_key] = s.setting_value
      }
    }

    let finalTitle = settingsMap.site_title || 'Joy House Community'
    let finalDescription = settingsMap.site_description || 'Building a supportive community for adults with special needs'
    let finalImage = settingsMap.og_image_url || 'https://lovable.dev/opengraph-image-p98pqg.png'
    let finalType = 'website'
    const redirectTarget = redirect || urlObj.searchParams.get('url') || SITE_URL
    let finalRedirect = redirectTarget
    let ogUrl = redirectTarget

    // Static page meta — hardcoded for specific pages
    const PAGE_META: Record<string, { title: string; description: string; image?: string; path: string }> = {
      'night-of-joy': {
        title: 'A Night of Joy – Best Day Ministries Fundraiser',
        description: 'Join us June 14, 2026 for A Night of Joy at Truitt Homestead. An evening of dinner, live entertainment & silent auction creating belonging and purpose for adults with special abilities.',
        image: 'https://nbvijawmjkycyweioglk.supabase.co/storage/v1/object/public/app-assets/og-images/night-of-joy-og.jpg',
        path: '/night-of-joy',
      },
    }

    if (pageId && PAGE_META[pageId]) {
      const page = PAGE_META[pageId]
      finalTitle = page.title
      finalDescription = page.description
      if (page.image) finalImage = page.image
      finalType = 'article'
      finalRedirect = redirect || `${SITE_URL}${page.path}`
      ogUrl = `${SITE_URL}/share?pageId=${pageId}&redirect=${encodeURIComponent(finalRedirect)}`
    }

    if (eventId) {
      const events = await querySupabase(
        'events',
        `select=id,title,description,image_url&id=eq.${eventId}&limit=1`
      )
      const event = events[0]
      if (event) {
        finalTitle = event.title
        finalDescription = event.description || finalDescription
        finalImage = event.image_url || finalImage
        finalType = 'article'
        finalRedirect = redirect || `${SITE_URL}/community?tab=feed&eventId=${event.id}`
        ogUrl = `${SITE_URL}/share?eventId=${event.id}&redirect=${encodeURIComponent(finalRedirect)}`
      }
    }

    if (newsletterId) {
      const newsletters = await querySupabase(
        'newsletter_campaigns',
        `select=id,title,display_name,display_image_url,subject,preview_text&id=eq.${newsletterId}&status=eq.sent&limit=1`
      )
      const newsletter = newsletters[0]
      if (newsletter) {
        finalTitle = newsletter.display_name || newsletter.title || newsletter.subject
        finalDescription = newsletter.preview_text || finalDescription
        if (newsletter.display_image_url) finalImage = newsletter.display_image_url
        finalType = 'article'
        finalRedirect = redirect || `${SITE_URL}/newsletters/${newsletter.id}`
        ogUrl = `${SITE_URL}/share?newsletterId=${newsletter.id}&redirect=${encodeURIComponent(finalRedirect)}`
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
  <meta property="og:url" content="${ogUrl}">
  <meta property="og:site_name" content="Joy House Community">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${finalTitle}">
  <meta name="twitter:description" content="${finalDescription}">
  <meta name="twitter:image" content="${finalImage}">
  ${twitterHandle ? `<meta name="twitter:site" content="@${twitterHandle}">` : ''}
  <link rel="canonical" href="${ogUrl}">
  <script>window.location.replace("${finalRedirect}");</script>
  <noscript><meta http-equiv="refresh" content="0; url=${finalRedirect}"></noscript>
</head>
<body>
  <p>Redirecting to <a href="${finalRedirect}">${finalRedirect}</a>...</p>
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
