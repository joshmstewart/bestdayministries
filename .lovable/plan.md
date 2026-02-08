

# Public Newsletter Archive with Shareable URLs

## What We're Building
A public-facing newsletter archive where anyone can browse past newsletters and read them as web pages. Each newsletter gets its own shareable URL with rich social media previews (so when shared on Facebook, LinkedIn, etc., it shows the newsletter title, preview text, and a nice card). Every page includes a subscribe CTA to convert readers into subscribers.

## Pages and Routes

### 1. Newsletter Archive List -- `/newsletters`
- Public page (no login required)
- Grid/list of all sent newsletters, newest first
- Each card shows: title, preview text, sent date, recipient count
- Click a card to open the full newsletter
- Subscribe CTA at the top and bottom of the page
- SEO-optimized with proper meta tags

### 2. Individual Newsletter Page -- `/newsletters/:id`
- Public page showing the full HTML content of a single newsletter
- Rendered in a styled container (max-width 600px to match email width)
- Share buttons (Twitter, Facebook, LinkedIn, Copy Link) at top and bottom
- Compact subscribe CTA sidebar/banner for non-subscribers
- SEO meta tags dynamically set from campaign title, preview_text
- "Back to all newsletters" navigation

### 3. Social Media Preview (Edge Function)
- Extend the existing `generate-meta-tags` edge function to support `newsletterId` parameter
- When shared on social media, the link goes through the edge function which returns proper OG tags, then redirects to the actual page
- This solves the SPA crawling problem (crawlers can't execute JS)

## Technical Details

### New Files
- `src/pages/NewsletterArchive.tsx` -- list page at `/newsletters`
- `src/pages/NewsletterView.tsx` -- individual newsletter page at `/newsletters/:id`

### Modified Files
- `src/App.tsx` -- add two new lazy-loaded routes
- `src/lib/internalPages.ts` -- register `/newsletters` route
- `supabase/functions/generate-meta-tags/index.ts` -- add `newsletterId` support

### Database
- **No schema changes needed** -- all required data (`title`, `subject`, `preview_text`, `html_content`, `sent_at`, `sent_to_count`) already exists in `newsletter_campaigns`
- Add an RLS policy to allow public SELECT on `newsletter_campaigns` for `status = 'sent'` rows only (currently admin-only)

### RLS Policy
```sql
CREATE POLICY "Anyone can view sent newsletters"
  ON newsletter_campaigns FOR SELECT
  USING (status = 'sent');
```
This ensures only published/sent newsletters are visible publicly. Drafts, scheduled, and archived campaigns remain hidden.

### Social Sharing Flow
1. User clicks "Share on Facebook" on `/newsletters/:id`
2. Share URL points to: `{supabase_url}/functions/v1/generate-meta-tags?newsletterId={id}&redirect={newsletter_page_url}`
3. Facebook crawler hits edge function, gets proper OG tags (title, description, image)
4. Edge function returns HTML with `meta http-equiv="refresh"` redirect to actual page
5. Human visitors get instantly redirected to the real newsletter page

### Subscribe CTA
- Reuses the existing compact `NewsletterSignup` component on individual pages
- Archive list page gets a hero section with the full signup form

### HTML Rendering
- Newsletter `html_content` is rendered inside a sandboxed container using `dangerouslySetInnerHTML`
- Wrapped in a 600px max-width container to match email rendering
- DOMPurify sanitization applied for safety
- Existing styles from the email HTML are preserved

