# SOCIAL SHARING SYSTEM - COMPLETE GUIDE

## OVERVIEW
Comprehensive social media sharing system with native share API support, multiple platforms, and both compact and expanded UI variants.

---

## COMPONENTS

### ShareButtons Component (`src/components/ShareButtons.tsx`)

**Purpose:** Reusable social sharing component with platform-specific integrations

**Props:**
```typescript
interface ShareButtonsProps {
  title: string;              // Share title
  description?: string;       // Share description
  url?: string;              // Custom URL (defaults to current page)
  hashtags?: string[];       // Array of hashtags (without #)
  via?: string;             // Twitter via username (default: "JoyHouseCommunity")
  image?: string;           // Image URL for sharing
  compact?: boolean;        // Use dropdown menu (default: false)
}
```

**Features:**
- **Mobile-first:** Native Web Share API on mobile devices
- **Desktop:** Platform-specific buttons (Twitter, Facebook, LinkedIn, Copy)
- **Compact mode:** Dropdown menu for tight spaces
- **Copy to clipboard:** Always available fallback
- **WhatsApp & Email:** Additional sharing options in compact mode

**Usage Examples:**

#### Expanded Version (Desktop)
```tsx
import { ShareButtons } from "@/components/ShareButtons";

<ShareButtons
  title="Amazing Community Event"
  description="Join us for a day of fun and creativity"
  url="https://joyhouse.community/events/123"
  hashtags={['JoyHouse', 'Community', 'Event']}
/>
```

#### Compact Version (Icon Button with Dropdown)
```tsx
import { ShareIconButton } from "@/components/ShareButtons";

<ShareIconButton
  title={post.title}
  description={post.content.substring(0, 150)}
  url={`${window.location.origin}/discussions?postId=${post.id}`}
  hashtags={['JoyHouse', 'Community']}
/>
```

---

## PLATFORM INTEGRATIONS

### Twitter/X
- Intent URL with title, URL, hashtags, and via parameter
- Opens in new window
- URL: `https://twitter.com/intent/tweet?text={title}&url={url}&via={via}&hashtags={hashtags}`

### Facebook
- Sharer dialog
- Opens in new window
- URL: `https://www.facebook.com/sharer/sharer.php?u={url}`

### LinkedIn
- Share offsite dialog
- Opens in new window
- URL: `https://www.linkedin.com/sharing/share-offsite/?url={url}`

### WhatsApp
- Web API for desktop/mobile
- Opens in new tab
- URL: `https://wa.me/?text={title} {url}`

### Email
- Standard mailto: link
- Subject: title
- Body: description + URL
- URL: `mailto:?subject={title}&body={description}%0A%0A{url}`

### Copy Link
- Uses Clipboard API
- Toast notification on success
- 2-second "Copied!" feedback
- Fallback from native share if unavailable

---

## IMPLEMENTATION LOCATIONS

### Discussion Posts (`src/pages/Discussions.tsx`)
**Location:** Post header, after author info and badges
**Type:** `ShareIconButton` (compact)
**Usage:**
```tsx
<ShareIconButton
  title={post.title}
  description={post.content.substring(0, 150)}
  url={`${window.location.origin}/discussions?postId=${post.id}`}
  hashtags={['JoyHouse', 'Community']}
/>
```

### Events (`src/pages/EventsPage.tsx`)
**Location:** Event card, after description
**Type:** `ShareIconButton` (compact)
**Usage:**
```tsx
<ShareIconButton
  title={event.title}
  description={event.description}
  url={`${window.location.origin}/events?eventId=${event.id}`}
  hashtags={['JoyHouse', 'CommunityEvent']}
/>
```

### Event Detail Dialog (`src/components/EventDetailDialog.tsx`)
**Location:** Bottom of dialog, border-top section
**Type:** `ShareButtons` (expanded)
**Usage:**
```tsx
<ShareButtons
  title={event.title}
  description={event.description}
  url={`${window.location.origin}/events?eventId=${event.id}`}
  hashtags={['JoyHouse', 'CommunityEvent']}
/>
```

---

## UI PATTERNS

### Desktop Layout (Expanded)
```
Share: [Twitter] [Facebook] [LinkedIn] [Copy]
```

### Mobile Layout (Expanded)
```
Share: [Share Button] (triggers native share)
```

### Compact Layout (All Devices)
```
[Share ▼] → Dropdown Menu:
  - Share (native)
  - Twitter
  - Facebook
  - LinkedIn
  - WhatsApp
  - Email
  - Copy Link
```

---

## NATIVE WEB SHARE API

### Detection
```typescript
if (navigator.share) {
  // Native share available (mobile)
} else {
  // Fallback to platform buttons or copy link
}
```

### Usage
```typescript
await navigator.share({
  title: title,
  text: description,
  url: shareUrl,
});
```

### Browser Support
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)
- ✅ Samsung Internet
- ❌ Desktop browsers (most don't support)

---

## STYLING

### Button Variants
- **Expanded buttons:** `variant="outline"`, `size="sm"`, `gap-2`
- **Compact trigger:** `variant="outline"`, `size="sm"`, `gap-2`
- **Dropdown items:** Standard DropdownMenuItem with icon + text

### Icon Sizes
- Expanded buttons: `w-4 h-4`
- Compact dropdown: `w-4 h-4 mr-2`

### Responsive Behavior
- **< md breakpoint:** Native share button only
- **≥ md breakpoint:** Platform-specific buttons

---

## BEST PRACTICES

### URL Construction
```typescript
// Always use absolute URLs
const shareUrl = url || window.location.href;

// For specific content
const shareUrl = `${window.location.origin}/discussions?postId=${post.id}`;
```

### Description Length
```typescript
// Keep descriptions under 150 characters for better display
description={post.content.substring(0, 150)}
```

### Hashtag Guidelines
- Use relevant, searchable hashtags
- 2-3 hashtags maximum
- No # symbol in array (added automatically)
- Example: `['JoyHouse', 'Community', 'Event']`

### Copy Feedback
- Always show toast notification on copy success
- Use visual feedback (Check icon) for 2 seconds
- Provide error handling for copy failures

---

## ACCESSIBILITY

### Keyboard Navigation
- All buttons/menu items keyboard accessible
- Dropdown menu: Arrow keys + Enter/Space
- Native share: Standard button semantics

### Screen Readers
- Platform names announced (Twitter, Facebook, etc.)
- "Share" text for native button
- "Copied!" feedback announced

### Touch Targets
- Minimum 44x44px touch target
- Adequate spacing between buttons
- Large enough dropdown items

---

## SEO BENEFITS

### Open Graph Tags
Social sharing works with SEO meta tags from `SEOHead` component:
- `og:title` → Share title
- `og:description` → Share description
- `og:image` → Share image preview
- `og:url` → Canonical URL

### Twitter Cards
- `twitter:card` → Summary card with large image
- `twitter:title` → Tweet title
- `twitter:description` → Tweet description
- `twitter:image` → Preview image

### Rich Previews
When users share, platforms fetch these meta tags for rich previews with images and descriptions.

---

## TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| Native share not working | Check HTTPS (required for Web Share API) |
| Wrong URL shared | Verify URL construction (use absolute URLs) |
| Clipboard fails | Check browser permissions, provide fallback |
| Dropdown doesn't open | Verify DropdownMenu imports |
| Icons not showing | Check lucide-react imports |
| Mobile shows both buttons | Check responsive classes (md:hidden, md:flex) |

---

## FUTURE ENHANCEMENTS

- [ ] Pinterest integration
- [ ] Reddit sharing
- [ ] Share count display
- [ ] Custom share images per content type
- [ ] Analytics tracking for share clicks
- [ ] QR code generation for easy mobile sharing
- [ ] Share history for logged-in users
- [ ] Pre-populated share templates
- [ ] A/B testing for share button placement

---

**Last Updated:** After implementing comprehensive social sharing system with native share API and platform integrations
