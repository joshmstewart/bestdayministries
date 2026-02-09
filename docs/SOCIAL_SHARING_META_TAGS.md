# SOCIAL SHARING & META TAGS SYSTEM

## THE PROBLEM

Social media platforms (Facebook, Twitter, LinkedIn) and messaging apps (iMessage, WhatsApp, SMS) use web crawlers to fetch link previews. These crawlers:
- **Do NOT execute JavaScript**
- Only read the initial HTML sent by the server
- Cache the meta tags for performance (7-30 days)

Since this is a React SPA (Single Page Application), all meta tags are updated client-side via JavaScript, which means:
- ❌ Social media & messaging app crawlers see only the default tags in `index.html`
- ❌ Dynamic page-specific meta tags are invisible to crawlers
- ❌ Updates to SEO settings don't appear in shared links (social media OR text messages)

## CURRENT IMPLEMENTATION

### Client-Side Meta Tags (SEOHead Component)
Located: `src/components/SEOHead.tsx`

```tsx
// Works for browsers, NOT for social media crawlers
<SEOHead
  title="Your Page Title"
  description="Your description"
  image="https://your-image-url.jpg"
/>
```

**What it does:**
- Loads SEO settings from database (`app_settings` table)
- Updates `document.title` and meta tags dynamically
- Adds structured data (JSON-LD)
- Updates on route changes

**Limitation:** Social media crawlers and messaging apps can't see these updates.

### Static Meta Tags (index.html)
Located: `index.html`

```html
<meta property="og:title" content="Joy House Community | ..." />
<meta property="og:description" content="Building a supportive..." />
<meta property="og:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />
```

**What crawlers see:** Always these static tags, regardless of which page is being shared.

## SOLUTIONS

### Solution 1: Social Media Cache Refresh (Immediate - Social Only)

When you update meta tags, social media platforms won't see changes immediately because they cache the old version. Force a refresh:

**⚠️ Important:** Text messaging apps (iMessage, WhatsApp, SMS) have NO cache-clearing tools available. They will continue showing cached previews for 7-30 days, or until you update the static HTML (Solution 2).

**Facebook:**
1. Go to https://developers.facebook.com/tools/debug/
2. Enter your URL
3. Click "Scrape Again" to clear cache

**Twitter:**
1. Go to https://cards-dev.twitter.com/validator
2. Enter your URL
3. Click "Preview card"

**LinkedIn:**
1. Go to https://www.linkedin.com/post-inspector/
2. Enter your URL
3. Click "Inspect"

### Solution 2: Update Default Meta Tags (Recommended for Text Messages)

Update `index.html` with your most important/common meta tags. This is the ONLY way to update text message previews immediately.

```html
<!-- Update these in index.html -->
<meta property="og:image" content="YOUR_MAIN_IMAGE_URL" />
<meta property="og:title" content="YOUR_SITE_TITLE" />
<meta property="og:description" content="YOUR_DESCRIPTION" />
```

**Pros:** 
- Works immediately for ALL platforms (social media AND text messages)
- No cache-clearing needed for text apps
- Most reliable solution

**Cons:** All pages show the same preview

### Solution 3: Edge Function for Dynamic Meta Tags (ACTIVE ✅)

**File:** `supabase/functions/social-preview/index.ts` (renamed from `generate-meta-tags` in Feb 2026)
**Auth:** Public (verify_jwt = false)
**Method:** GET

This edge function generates an HTML page with proper OG meta tags, then redirects the browser via JS. Social crawlers (which don't execute JS) read the OG tags; human visitors get redirected instantly.

**Cloudflare Proxy Setup (ACTIVE):**
A Cloudflare Redirect Rule proxies `bestdayministries.org/share?...` to the edge function. This means shared URLs show the custom domain, not the Supabase domain.

**Query Parameters:**
| Param | Description |
|-------|-------------|
| `eventId` | Fetches event title/description/image from `events` table |
| `newsletterId` | Fetches newsletter title/preview/image from `newsletter_campaigns` (sent only) |
| `redirect` | URL to redirect browsers to after crawlers read OG tags |

**Share URL format:**
```
https://bestdayministries.org/share?newsletterId={id}&redirect=https://bestdayministries.org/newsletters/{id}
https://bestdayministries.org/share?eventId={id}&redirect=https://bestdayministries.org/community?tab=feed&eventId={id}
```

**Fallback defaults** loaded from `app_settings` table: `site_title`, `site_description`, `og_image_url`, `twitter_handle`.

**Testing:**
- [Facebook Debugger](https://developers.facebook.com/tools/debug/)
- [OpenGraph.xyz](https://www.opengraph.xyz/)
- Direct: `https://nbvijawmjkycyweioglk.supabase.co/functions/v1/social-preview?redirect=https://bestdayministries.org`

**Deployment Note (Feb 2026):** Originally named `generate-meta-tags` but renamed to `social-preview` due to persistent deployment issues where the function would report "deployed successfully" but return 404. The simplified version also inlines `SITE_URL` instead of importing from `_shared/domainConstants.ts` and uses `@supabase/supabase-js@2` (not pinned). If deployment issues recur, try delete + redeploy.

**Pros:** Dynamic, page-specific meta tags; works with Cloudflare proxy
**Cons:** Requires Cloudflare setup for custom domain URLs

### Solution 4: Meta Tag Proxy Service (Recommended for Production)

Use a service like:
- **Cloudflare Workers** - Detect crawlers, inject meta tags
- **Vercel Edge Functions** - Pre-render meta tags at edge
- **Netlify Edge Functions** - Dynamic HTML generation

These detect social media bots and serve proper HTML with meta tags, while regular users get the normal React app.

## RECOMMENDED APPROACH

**For most users (especially if sharing via text):**

1. **Update index.html** with your best default meta tags (especially og:image) - This is the ONLY way to fix text message previews
2. **Use the cache refresh tools** (Facebook, Twitter, LinkedIn) after updating SEO settings
3. **Add query parameters** to force new cache when sharing:
   ```
   https://yoursite.com/page?v=2
   ```

**Why this matters for text messages:**
- iMessage, WhatsApp, and SMS apps have no cache-clearing tools
- They will show old previews for weeks unless you update index.html
- This is the most common sharing method for mobile users

For production apps with dynamic content:
- Consider server-side rendering (SSR) with frameworks like Next.js
- Or implement a bot detection + meta tag injection solution

## IMAGE REQUIREMENTS

Social media platforms have specific requirements:

**Facebook:**
- Min: 200x200px
- Recommended: 1200x630px
- Format: JPG or PNG
- Max: 8MB

**Twitter:**
- Large card: 800x418px minimum
- Small card: 120x120px minimum
- Max: 5MB

**LinkedIn:**
- Recommended: 1200x627px
- Min: 200x200px

## TESTING YOUR META TAGS

1. **Facebook Debugger:** https://developers.facebook.com/tools/debug/
2. **Twitter Card Validator:** https://cards-dev.twitter.com/validator
3. **LinkedIn Inspector:** https://www.linkedin.com/post-inspector/
4. **Open Graph Checker:** https://www.opengraph.xyz/

## DATABASE SETTINGS

SEO settings stored in `app_settings` table:

| setting_key | Description |
|-------------|-------------|
| `site_title` | Default site title |
| `site_description` | Default description |
| `og_image_url` | Default Open Graph image |
| `twitter_handle` | Twitter username (without @) |

Update via Admin Panel → Settings → App Settings

## TROUBLESHOOTING

**Q: I updated my image but Facebook still shows the old one**
A: Clear Facebook's cache using their Sharing Debugger tool

**Q: Text message previews (iMessage/WhatsApp) still show old image**
A: These apps have no cache-clearing tools. You MUST update the static meta tags in index.html, or wait 7-30 days for cache to expire naturally.

**Q: Different platforms show different previews**
A: Each platform caches independently - clear each one separately (social media only; text apps can't be cleared)

**Q: My changes work in browser but not when sharing**
A: Client-side updates (SEOHead) don't work for crawlers - use index.html or edge functions

**Q: How long do platforms cache meta tags?**
A: Social media: 7-30 days (but can force refresh with tools). Text messaging apps: 7-30 days (NO tools to force refresh)

## FUTURE IMPROVEMENTS

Consider migrating to:
- **Next.js** - Built-in SSR for proper meta tag support
- **Remix** - Server-side rendering with excellent meta tag handling
- **Astro** - Static site generation with dynamic islands

These frameworks generate proper HTML on the server, solving the social sharing problem permanently.
