import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Content-Type': 'application/xml',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const baseUrl = new URL(req.url).origin;
    const currentDate = new Date().toISOString().split('T')[0];

    // Start building sitemap
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Static pages
    const staticPages = [
      { path: '/', priority: '1.0', changefreq: 'daily' },
      { path: '/about', priority: '0.9', changefreq: 'monthly' },
      { path: '/auth', priority: '0.8', changefreq: 'monthly' },
      { path: '/community', priority: '0.9', changefreq: 'weekly' },
      { path: '/discussions', priority: '0.9', changefreq: 'daily' },
      { path: '/events', priority: '0.9', changefreq: 'weekly' },
      { path: '/marketplace', priority: '0.9', changefreq: 'daily' },
      { path: '/gallery', priority: '0.8', changefreq: 'weekly' },
      { path: '/videos', priority: '0.8', changefreq: 'weekly' },
      { path: '/sponsor-bestie', priority: '0.9', changefreq: 'monthly' },
      { path: '/support', priority: '0.8', changefreq: 'monthly' },
      { path: '/help', priority: '0.7', changefreq: 'monthly' },
      { path: '/joy-rocks', priority: '0.7', changefreq: 'monthly' },
      { path: '/partners', priority: '0.7', changefreq: 'monthly' },
    ];

    staticPages.forEach(page => {
      sitemap += `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    });

    // Fetch dynamic content
    // Discussion posts
    const { data: posts } = await supabase
      .from('discussion_posts')
      .select('id, updated_at')
      .eq('is_moderated', true)
      .order('updated_at', { ascending: false })
      .limit(1000);

    if (posts) {
      posts.forEach(post => {
        const lastmod = post.updated_at ? new Date(post.updated_at).toISOString().split('T')[0] : currentDate;
        sitemap += `  <url>
    <loc>${baseUrl}/discussions?postId=${post.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      });
    }

    // Events
    const { data: events } = await supabase
      .from('events')
      .select('id, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1000);

    if (events) {
      events.forEach(event => {
        const lastmod = event.updated_at ? new Date(event.updated_at).toISOString().split('T')[0] : currentDate;
        sitemap += `  <url>
    <loc>${baseUrl}/events?eventId=${event.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      });
    }

    // Albums
    const { data: albums } = await supabase
      .from('albums')
      .select('id, updated_at')
      .eq('is_active', true)
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(1000);

    if (albums) {
      albums.forEach(album => {
        const lastmod = album.updated_at ? new Date(album.updated_at).toISOString().split('T')[0] : currentDate;
        sitemap += `  <url>
    <loc>${baseUrl}/gallery?albumId=${album.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      });
    }

    // Vendors
    const { data: vendors } = await supabase
      .from('vendors')
      .select('id, updated_at')
      .eq('status', 'approved')
      .order('updated_at', { ascending: false })
      .limit(1000);

    if (vendors) {
      vendors.forEach(vendor => {
        const lastmod = vendor.updated_at ? new Date(vendor.updated_at).toISOString().split('T')[0] : currentDate;
        sitemap += `  <url>
    <loc>${baseUrl}/vendors/${vendor.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      });
    }

    sitemap += `</urlset>`;

    return new Response(sitemap, {
      headers: corsHeaders,
      status: 200,
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
