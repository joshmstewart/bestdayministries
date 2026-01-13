# HELP CENTER SYSTEM - COMPLETE DOCUMENTATION

## OVERVIEW
Comprehensive help center with interactive product tours, searchable guides, and FAQs. Fully database-driven with admin management interface.

**Current Content (as of 2026-01-13):**
- **12 Tours**: Getting started, discussions, guardian dashboard, vendor dashboard, sponsorship, games, marketplace, events, albums, notifications, recipe pal, sticker collecting
- **11 Guides**: Welcome, profile, guardian linking, content approval, sponsorship, marketplace, games, events, discussions, vendor guide, account settings
- **60 FAQs**: Covering general, bestie, guardian, supporter, vendor, games, events, technical, account, and marketplace categories

---

## DATABASE SCHEMA

### help_tours
Interactive step-by-step walkthroughs using react-joyride.

**Columns:**
- `id`, `title`, `description`, `target_audience`, `category`
- `steps` (JSONB) - Array of Joyride step objects
- `display_order`, `is_active`, `duration_minutes`, `icon`
- `created_at`, `updated_at`, `created_by`

**Step Format:**
```json
[
  {
    "target": ".css-selector",
    "content": "This is the step content",
    "title": "Step Title (optional)",
    "placement": "bottom",
    "disableBeacon": true
  }
]
```

### help_guides
Long-form documentation with markdown-like formatting.

**Columns:**
- `id`, `title`, `description`, `content` (TEXT)
- `category`, `target_audience`, `reading_time_minutes`
- `display_order`, `is_active`, `icon`
- `created_at`, `updated_at`, `created_by`

**Content Formatting:**
- Headers: `# H1`, `## H2`, `### H3`
- Lists: `- Item` or `1. Item`
- Paragraphs: Separated by double newlines

### help_faqs
Question and answer pairs grouped by category.

**Columns:**
- `id`, `question`, `answer`
- `category`, `target_audience`
- `display_order`, `is_active`
- `created_at`, `updated_at`, `created_by`

---

## USER WORKFLOWS

### 1. BROWSE HELP CENTER
**Location:** `/help`

**Tabs:**
- **Tours:** Interactive walkthroughs with duration estimates
- **Guides:** Step-by-step documentation with reading time
- **FAQs:** Categorized questions with accordion display

**Search:**
- Real-time filtering across all tabs
- Searches titles, descriptions, questions, answers

**Filtering:**
- Content automatically filtered by user role (target_audience)
- Category badges color-coded

### 2. TAKE A PRODUCT TOUR
**Flow:**
1. Click "Start Tour" on tour card
2. Tour navigates to required route (preserves `?tour=xxx` param)
3. Interactive overlay highlights UI elements
4. Follow prompts with Next/Back navigation
5. Skip or close anytime

**Features:**
- Auto-scrolling to elements with 150px offset (accounts for header/nav)
- Progress indicator
- Keyboard navigation support
- Mobile responsive
- Route-specific tours automatically navigate to correct page
- Query parameter preservation during navigation

### 3. READ A GUIDE
**Flow:**
1. Click "Read Guide" on guide card
2. Opens in full-screen dialog
3. Scroll through formatted content
4. Close when done

**Display:**
- Clean typography with proper spacing
- Formatted headers, lists, paragraphs
- Reading time estimate shown
- Scrollable content area

### 4. VIEW FAQS
**Accordion Display:**
- Grouped by category
- Click question to expand answer
- Only one answer open at a time
- Color-coded category badges

---

## ADMIN WORKFLOWS

### 1. MANAGE TOURS
**Location:** Admin → Help Center → Tours

**Actions:**
- Create/edit/delete tours
- Set category, audience, duration
- Write Joyride steps in JSON
- Toggle visibility
- Reorder with display_order

**Step Configuration:**
```json
[
  {
    "target": ".community-feed",
    "content": "This is your community feed where you'll see the latest updates.",
    "title": "Welcome to Community",
    "placement": "bottom"
  }
]
```

**Categories:**
- general, feature, role-specific, getting-started

**Target Audiences:**
- all, bestie, caregiver, supporter, vendor, admin

### 2. MANAGE GUIDES
**Location:** Admin → Help Center → Guides

**Actions:**
- Create/edit/delete guides
- Write markdown content
- Set reading time estimate
- Toggle visibility
- Organize by category

**Content Tips:**
- Use headers for structure
- Break into digestible sections
- Add examples and screenshots (describe them)
- Estimate 200 words per minute for reading time

**Categories:**
- general, getting-started, features, advanced

### 3. MANAGE FAQS
**Location:** Admin → Help Center → FAQs

**Actions:**
- Create/edit/delete FAQs
- Set category for grouping
- Reorder within categories
- Toggle visibility

**Categories:**
- general, account, sponsorship, technical, billing

**Best Practices:**
- Keep answers concise (under 200 words)
- Use plain language
- Link to guides for detailed info
- Address one topic per FAQ

---

## COMPONENT STRUCTURE

### Public Components

**HelpCenter.tsx** (Main page)
- Search bar with real-time filtering
- Tabbed interface (Tours/Guides/FAQs)
- Card grid layouts
- Empty states

**ProductTourRunner.tsx**
- Joyride wrapper with custom styling
- Callback handling for completion
- Manual close button overlay
- Themed to match app design

**GuideViewer.tsx**
- Full-screen dialog
- Markdown-like content rendering
- Scrollable area with metadata
- Reading time display

**FAQSection.tsx**
- Accordion-based display
- Category grouping
- Badge color coding
- Collapsible answers

### Admin Components

**HelpCenterManager.tsx**
- Tab switcher for Tours/Guides/FAQs
- Delegates to specialized managers

**TourManager.tsx**
- CRUD interface for tours
- JSON editor for steps
- Form validation
- Visibility toggles

**GuideManager.tsx**
- CRUD interface for guides
- Large textarea for content
- Reading time input
- Preview capability

**FAQManager.tsx**
- CRUD interface for FAQs
- Question/answer fields
- Category assignment
- Quick visibility toggle

---

## RLS POLICIES

**All Tables:**
- **SELECT:** Active items visible to everyone
- **ALL:** Admins can create/update/delete

**Security:**
- Content filtered by `is_active` flag
- No user authentication required to view
- Only admins can manage content

---

## TECHNICAL IMPLEMENTATION

### Dependencies
- **react-joyride:** Product tour library
- **@radix-ui/react-dialog:** Guide viewer modal
- **@radix-ui/react-accordion:** FAQ display

### Styling
- Uses design system tokens
- Responsive grid layouts
- Category badge colors from consistent palette
- Smooth animations and transitions

### State Management
- Local state for search/filters
- Supabase real-time updates (optional)
- Dialog open/close states

### Performance
- Lazy loading for tour runner
- Efficient search filtering
- Minimal re-renders
- Optimized JSON parsing

### Tour System Details
**Navigation Handling:**
- Tours preserve `?tour=xxx` query parameter during route navigation
- Automatic element detection with 5-second timeout fallback
- 150px scroll offset to prevent header/nav overlap

**Beacon Behavior:**
- All tours have `disableBeacon: true` applied automatically by `ProductTourRunner`
- Tooltips appear immediately without glowing orange dot
- No user click required to start tour steps
- Applied to all tours system-wide

**Reliability Features:**
- Query parameter preservation across route changes
- Element availability checking before starting
- Graceful fallback if elements not found
- Proper cleanup on unmount

---

## USE CASES

### For New Users
**Getting Started Tour:**
```json
{
  "title": "Welcome to Best Day Ministries",
  "category": "getting-started",
  "target_audience": "all",
  "steps": [
    {"target": ".logo", "content": "Welcome! Let's show you around."},
    {"target": ".nav-bar", "content": "Navigate between pages here."},
    {"target": ".community-feed", "content": "See latest community updates."}
  ]
}
```

### For Caregivers
**Guardian Features Guide:**
```markdown
# Guardian Features

## Overview
As a guardian, you can manage and approve content for besties you're linked with.

## Key Features
- Approve discussion posts and comments
- Manage sponsorship messages
- Monitor vendor interactions
```

### For All Users
**Common FAQ:**
```
Q: How do I reset my password?
A: Click on your profile icon, select Settings, then choose "Change Password". You'll receive an email with reset instructions.
```

---

## CONTENT STRATEGY

### Tour Planning
1. **Map User Journey:** Identify key first-time actions
2. **Keep It Short:** 5-7 steps maximum per tour
3. **Focus on Value:** Highlight benefits, not just features
4. **Test Thoroughly:** Ensure selectors work across devices

### Guide Writing
1. **Start with Why:** Explain the purpose
2. **Show, Don't Tell:** Use concrete examples
3. **Structure Logically:** Headers → steps → outcomes
4. **Update Regularly:** Keep content current

### FAQ Curation
1. **Monitor Support:** Track common questions
2. **Group Smart:** Organize by user journey, not alphabetically
3. **Link Resources:** Reference guides for detailed info
4. **Refresh Often:** Update answers as features change

---

## COMMON ISSUES

| Issue | Cause | Solution |
|-------|-------|----------|
| Tour doesn't start | Invalid CSS selector | Verify selector exists in DOM |
| Tour doesn't start after navigation | Query param lost during route change | System now preserves `?tour=xxx` automatically |
| Elements hidden behind header | Default scroll positioning | Fixed with 150px scrollOffset |
| Glowing orange dot appears | Joyride default beacon | All tours auto-disable beacons via ProductTourRunner |
| Tour requires click to start | Beacon enabled on step | System sets disableBeacon: true on all steps |
| Steps out of order | Wrong display_order | Update display_order values |
| Guide formatting broken | Invalid markdown syntax | Use simple formatting only |
| FAQ not showing | Wrong category or inactive | Check is_active and category |
| Search not working | Missing search query | Verify state management |
| Tour preview from admin doesn't work | Navigation timing issue | Fixed with proper query param handling |

---

## FUTURE ENHANCEMENTS

### Planned Features
- [ ] Video tutorials embedded in guides
- [ ] Tour completion tracking
- [ ] User feedback on helpfulness
- [ ] Contextual help tooltips
- [ ] Multi-language support
- [ ] Tour analytics (completion rates)
- [ ] Guide versioning
- [ ] Related content suggestions
- [ ] Print-friendly guide export
- [ ] Admin content preview mode

### Nice to Have
- [ ] Interactive demos (sandbox mode)
- [ ] User-submitted FAQs
- [ ] Help article ratings
- [ ] Search analytics
- [ ] Tour recordings (video)
- [ ] AI-powered help assistant
- [ ] Onboarding wizard
- [ ] Progressive disclosure (layered help)

---

## INTEGRATION POINTS

### Navigation
- Added to internal pages registry (`/help`)
- Accessible from all authenticated routes
- Can be linked from other pages

### Admin Dashboard
- New tab: Help Center
- Sub-tabs for Tours/Guides/FAQs
- Integrated with existing admin interface

### User Onboarding
- Can trigger tours on first login
- Context-aware help based on role
- Progressive feature discovery

---

## BEST PRACTICES

### Content Creation
✅ **DO:**
- Write for your audience (use their language)
- Test tours on actual UI before publishing
- Keep guides focused on single topics
- Update content when features change

❌ **DON'T:**
- Assume technical knowledge
- Create overly long tours (7+ steps)
- Duplicate content across guides
- Forget to set target audience

### Maintenance
✅ **DO:**
- Review quarterly for accuracy
- Archive outdated content
- Monitor user feedback
- Keep categories organized

❌ **DON'T:**
- Let inactive content clutter system
- Ignore broken tour selectors
- Mix multiple topics in one guide
- Forget to update after UI changes

---

## EXAMPLE CONTENT

### Sample Tour (Caregiver Approvals)
```json
{
  "title": "Approving Bestie Content",
  "description": "Learn how to review and approve posts from your linked besties",
  "category": "role-specific",
  "target_audience": "caregiver",
  "duration_minutes": 3,
  "steps": [
    {
      "target": ".approvals-badge",
      "content": "When besties submit content, you'll see a notification here.",
      "title": "Approval Notifications"
    },
    {
      "target": ".pending-posts-tab",
      "content": "Review pending posts in this tab.",
      "title": "Pending Posts"
    },
    {
      "target": ".approve-button",
      "content": "Click here to approve content or provide feedback.",
      "title": "Approval Actions"
    }
  ]
}
```

### Sample Guide (Sponsorship)
```markdown
# How to Sponsor a Bestie

## What is Sponsorship?
Sponsoring a bestie provides monthly financial support to help them thrive in our community.

## Steps to Sponsor
1. Visit the Sponsor page
2. Browse available besties
3. Select an amount ($10-$500)
4. Choose frequency (one-time or monthly)
5. Complete secure checkout

## Managing Your Sponsorship
- View active sponsorships in My Besties
- Update payment method anytime
- Cancel or modify through Stripe portal
```

### Sample FAQ
```
Category: Sponsorship

Q: Can I sponsor multiple besties?
A: Yes! You can sponsor as many besties as you'd like. Each sponsorship is managed separately, and you can view all your active sponsorships in the My Besties section.

Q: How do I cancel my monthly sponsorship?
A: Click "Manage Subscription" next to the bestie in My Besties, then use the Stripe portal to cancel. Your sponsorship will remain active until the end of the current billing period.
```

---

## FILES

**Pages:**
- `src/pages/HelpCenter.tsx` - Main help center page

**Public Components:**
- `src/components/help/ProductTourRunner.tsx` - Tour execution
- `src/components/help/GuideViewer.tsx` - Guide display
- `src/components/help/FAQSection.tsx` - FAQ accordion

**Admin Components:**
- `src/components/admin/HelpCenterManager.tsx` - Main manager
- `src/components/admin/help/TourManager.tsx` - Tour CRUD
- `src/components/admin/help/GuideManager.tsx` - Guide CRUD
- `src/components/admin/help/FAQManager.tsx` - FAQ CRUD

**Database:**
- Migration: `supabase/migrations/[timestamp]_help_center.sql`

**Documentation:**
- `docs/HELP_CENTER_SYSTEM.md` (this file)

---

**Last Updated:** After implementing beacon disable, scroll offset fix, and navigation preservation for all tours
