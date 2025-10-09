# SEO & PERFORMANCE OPTIMIZATION - COMPLETE GUIDE

## OVERVIEW
Comprehensive SEO and performance optimization system with dynamic meta tags, structured data, sitemaps, and image optimization.

---

## SEO COMPONENTS

### SEOHead Component (`src/components/SEOHead.tsx`)

**Purpose:** Dynamic meta tag management for every page

**Props:**
```typescript
interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  noindex?: boolean;
  canonicalUrl?: string;
  structuredData?: object;
}
```

**Features:**
- Updates `<title>` tag
- Manages Open Graph tags (og:title, og:description, og:image, etc.)
- Twitter Card meta tags
- Canonical URLs
- Robots meta tag
- JSON-LD structured data injection

**Usage:**
```tsx
import { SEOHead, getOrganizationStructuredData } from "@/components/SEOHead";

<SEOHead
  title="Custom Page Title"
  description="Custom description"
  structuredData={getOrganizationStructuredData()}
/>
```

---

## STRUCTURED DATA

### Organization Schema
```tsx
getOrganizationStructuredData()
```
- Used on homepage
- Includes name, logo, contact info, social profiles
- Schema.org compliant

### Article Schema
```tsx
getArticleStructuredData(title, description, image, datePublished, author)
```
- For blog posts and discussion posts
- Includes headline, author, publisher info

### Event Schema
```tsx
getEventStructuredData(name, description, startDate, location, image?)
```
- For events pages
- Includes location, date, description

---

## SITEMAP GENERATION

### Edge Function (`supabase/functions/generate-sitemap/index.ts`)

**Generates dynamic XML sitemap including:**
- Static pages (homepage, about, marketplace, etc.)
- Discussion posts (is_moderated = true)
- Events (is_active = true)
- Albums (is_active + is_public = true)
- Vendor stores (status = 'approved')

**Features:**
- Automatic lastmod dates from `updated_at` columns
- Change frequency hints for search engines
- Priority weighting
- 1000 item limit per content type

**Accessing:**
- Call edge function: `https://your-domain.com/functions/v1/generate-sitemap`
- Static fallback: `/public/sitemap.xml`

**Submit to Search Engines:**
- Google Search Console: Submit sitemap URL
- Bing Webmaster Tools: Submit sitemap URL

---

## IMAGE OPTIMIZATION

### OptimizedImage Component (`src/components/OptimizedImage.tsx`)

**Features:**
- Lazy loading (except priority images)
- Intersection Observer (loads 50px before viewport)
- Blur placeholder during load
- Fade-in animation on load
- Proper `loading` and `decoding` attributes

**Props:**
```typescript
interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean; // Skip lazy loading for above-fold images
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  onLoad?: () => void;
}
```

**Usage:**
```tsx
import { OptimizedImage } from "@/components/OptimizedImage";

<OptimizedImage
  src={imageUrl}
  alt="Descriptive alt text"
  priority={true} // For hero images
  objectFit="cover"
/>
```

**When to use `priority`:**
- Hero images (above the fold)
- Logo
- Critical UI elements visible on page load

**Automatic features:**
- Lazy loading for non-priority images
- Placeholder animation
- Smooth fade-in transition

---

## PERFORMANCE OPTIMIZATIONS

### HTML Head Optimizations (`index.html`)

**Preconnect:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```
- Reduces DNS lookup time for external resources

**Preload:**
```html
<link rel="preload" as="image" href="/favicon.png" />
```
- Prioritizes critical resources

**Theme Color:**
```html
<meta name="theme-color" content="#FF6B35" />
```
- Sets browser theme color on mobile

### Image Compression
- All images compressed via `imageUtils.ts` (max 5MB, 1920px)
- Automatic quality reduction for oversized images
- Maintains aspect ratio

### Code Splitting
- React lazy loading for routes (already implemented in App.tsx)
- Dynamic imports for heavy components

---

## SEO BEST PRACTICES

### Meta Tag Guidelines
✅ **DO:**
- Keep titles under 60 characters
- Keep descriptions under 160 characters
- Include primary keywords naturally
- Use unique titles/descriptions per page
- Include relevant keywords in alt text

❌ **DON'T:**
- Keyword stuff
- Duplicate meta tags across pages
- Use generic descriptions
- Forget alt attributes on images

### Structured Data Guidelines
✅ **DO:**
- Use schema.org types
- Include all required properties
- Test with Google Rich Results Test
- Keep data accurate and up-to-date

❌ **DON'T:**
- Add irrelevant schema
- Include false information
- Nest improperly

### Image SEO
✅ **DO:**
- Use descriptive filenames
- Always include alt text
- Specify width/height when possible
- Use lazy loading for below-fold images

❌ **DON'T:**
- Use generic filenames (image1.jpg)
- Leave alt text empty
- Load all images eagerly

---

## PAGE-SPECIFIC SEO

### Homepage (`src/pages/Index.tsx`)
```tsx
<SEOHead
  title="Joy House Community | Spreading Joy Through Special Needs Community"
  description="Building a supportive community..."
  structuredData={getOrganizationStructuredData()}
/>
```

### Other Pages
Import `SEOHead` and customize:
```tsx
import { SEOHead, getArticleStructuredData } from "@/components/SEOHead";

<SEOHead
  title="Page Title | Joy House Community"
  description="Page-specific description"
  type="article"
  structuredData={getArticleStructuredData(...)}
/>
```

---

## MONITORING & TESTING

### Tools
- **Google Search Console:** Index coverage, search performance
- **Google PageSpeed Insights:** Performance scores
- **Lighthouse:** Audit tool (built into Chrome DevTools)
- **Schema.org Validator:** Test structured data
- **Google Rich Results Test:** Test schema markup

### Key Metrics
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1
- **Time to Interactive:** < 3.5s

---

## TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| Images load slowly | Check if `priority={true}` for above-fold images |
| Duplicate meta tags | Use `SEOHead` component consistently |
| Sitemap not updating | Regenerate via edge function |
| Poor mobile performance | Enable lazy loading, compress images |
| Missing structured data | Add JSON-LD via `SEOHead` |

---

## FUTURE ENHANCEMENTS
- [ ] Image CDN integration
- [ ] Service worker for offline caching
- [ ] WebP format support with fallbacks
- [ ] Automatic sitemap submission
- [ ] Real-time performance monitoring
- [ ] A/B testing for meta descriptions
- [ ] Automatic image resizing pipeline

---

**Last Updated:** After implementing comprehensive SEO and performance optimization system
