MASTER_SYSTEM_DOCS

## ⚠️ CRITICAL: DOCUMENTATION WORKFLOW - READ FIRST ⚠️

**THIS IS MANDATORY. NO EXCEPTIONS. DOCUMENTATION = SOURCE OF TRUTH.**

**OUTPUT THIS BEFORE ANY CODE CHANGES:**
```
PRE-CHANGE CHECKLIST:
□ Searched docs for: [terms]
□ Read files: [list]
□ Searched code for: [patterns]
□ Found patterns: [yes/no - describe]
□ Ready: [yes/no]
```

---

### 🔴 BEFORE MAKING ANY CODE CHANGES - MANDATORY CHECKLIST:

**STEP 1: SEARCH DOCUMENTATION (REQUIRED)**
- Use `lov-search-files` to search for relevant documentation:
  - Search `docs/**` for system name (e.g., "newsletter", "sticker", "sponsorship")
  - Search `docs/MASTER_SYSTEM_DOCS.md` for the feature area
  - Search for related edge function docs in `docs/EDGE_FUNCTIONS_REFERENCE.md`
- **DO NOT SKIP THIS STEP** - You cannot know what exists without searching

**STEP 2: READ COMPLETE DOCUMENTATION (REQUIRED)**
- Read the ENTIRE relevant section of MASTER_SYSTEM_DOCS.md
- Read ANY dedicated system documentation file (e.g., `NEWSLETTER_SYSTEM.md`, `STICKER_PACK_SYSTEM.md`)
- Read edge function documentation if modifying backend
- **MEMORIZE** the patterns, schemas, RLS policies, and component structures

**STEP 3: SEARCH AND READ EXISTING CODE (REQUIRED)**
- Use `lov-search-files` to find ALL files related to the feature:
  - Search for component names mentioned in docs
  - Search for database table names
  - Search for edge function names
  - Search for hook names and utility functions
- Use `lov-view` to READ the actual implementation of related files
- **UNDERSTAND** how the existing code works before changing anything

**STEP 4: VERIFY YOUR UNDERSTANDING (REQUIRED)**
- Can you explain the current architecture in your own words?
- Do you know which RLS policies protect which tables?
- Do you understand the data flow and state management?
- Have you identified all files that need to change?
- **IF NO TO ANY** → Go back and read more documentation and code

**STEP 5: FOLLOW ESTABLISHED PATTERNS (REQUIRED)**
- Use the SAME component structure as existing code
- Use the SAME naming conventions
- Use the SAME state management patterns
- Use the SAME database query patterns
- **DO NOT REINVENT** patterns that already exist
- **DO NOT CONTRADICT** documented approaches

---

### 🔴 AFTER MAKING CODE CHANGES - MANDATORY UPDATES:

**STEP 1: UPDATE MASTER_SYSTEM_DOCS.md**
- Add new patterns to the relevant section
- Update changed patterns with accurate information
- Add cross-references if integrating with other systems

**STEP 2: UPDATE SPECIFIC SYSTEM DOCS**
- Update or create dedicated system documentation files
- Document new database tables, edge functions, components
- Update workflows and usage examples

**STEP 3: UPDATE EDGE_FUNCTIONS_REFERENCE.md**
- Document any new or modified edge functions
- Update request/response formats
- Document any new secrets or environment variables

---

### 🔴 CONSEQUENCES OF IGNORING THIS WORKFLOW:

**BUGS YOU WILL CREATE:**
- RLS policy bugs (auth.uid() called without authentication check)
- Missing foreign key relationships causing orphaned data
- Inconsistent state management causing race conditions
- Missing realtime subscriptions causing stale UI
- Breaking existing integrations between systems

**WASTED TIME:**
- Debugging issues that documentation already warned about
- Rewriting code that follows wrong patterns
- Multiple fix attempts because root cause not understood
- User frustration from repeated failures

**LOSS OF TRUST:**
- User loses confidence in AI assistance
- User must manually review all AI changes
- User stops using AI for complex tasks

---

### ✅ EXAMPLE OF CORRECT WORKFLOW:

**User Request:** "Add email logging to newsletter system"

**CORRECT APPROACH:**
1. Search: `lov-search-files` for "newsletter" in `docs/**`
2. Read: `docs/NEWSLETTER_SYSTEM.md` completely
3. Search: `lov-search-files` for "send-newsletter" in `supabase/functions/**`
4. Read: `supabase/functions/send-newsletter/index.ts` completely
5. Search: `lov-search-files` for "newsletter_campaigns" to find all related code
6. Read: All components that use newsletter data
7. Understand: Current email sending flow, database schema, RLS policies
8. Implement: Follow existing patterns for logging (check other *_log tables)
9. Update: All three documentation files with new logging feature

**WRONG APPROACH:**
1. ❌ Immediately start coding without checking docs
2. ❌ Assume how the system works without reading code
3. ❌ Create new patterns instead of following existing ones
4. ❌ Skip updating documentation after changes

---

**THIS IS NOT OPTIONAL. THIS IS NOT A SUGGESTION. THIS IS MANDATORY.**

---

## GUARDIAN_APPROVALS|/guardian-approvals|caregiver
TABS:posts|comments|vendors|messages→approve/reject/del
DB:caregiver_bestie_links(require_post_approval|require_comment_approval|require_message_approval|require_vendor_asset_approval)
BADGE:useGuardianApprovalsCount→SUM-pending→realtime×4
RLS:is_guardian_of()→UPDATE

## VIDEO
COMPS:VideoPlayer(NO-object-fit)|YouTubeEmbed|YouTubeChannel(custom-SVG-logo)|VideoSection(reusable-component+title+desc+video-type-selector)|VideoScreenshotCapture(auto-3-frames+manual-capture+crop+aspect-detection)
DB:videos[cover_url+cover_timestamp]|about_sections.youtube_channel|homepage_sections.homepage_video[video_type+video_id|youtube_url]|support_page_sections.support_video[video_type+video_id|youtube_url]|storage:videos-bucket+covers-folder
ADMIN:VideoManager[screenshot-capture-workflow]|YouTube-Channel-config|VideoSection-usage[Homepage+Support-page]→type-selector[uploaded-dropdown|youtube-URL-input]
SCREENSHOT-CAPTURE:upload-video→capture-btn→auto-3-frames[25%+50%+75%]→manual-capture-optional→select→crop[aspect-detection]→save-cover
ADMIN-PATTERN:VideoManager[upload→screenshot-btn→select-frame→crop→preview]|SectionContentDialog[video_type→conditional-inputs]|SupportPageManager[video_type→conditional-inputs]
VIDEO-ASPECT:auto-detect-dimensions→map-to-standard[1:1|16:9|9:16|4:3|3:4|3:2|2:3]→set-default-crop-ratio
USAGE:Homepage[homepage_video-section]|Support-Page[support_video-section]→both-use-VideoSection-component
DOC:VIDEO_SYSTEM_COMPLETE.md

## AUDIO_RECORDING_STANDARD
ICON:Mic[w-5-h-5+text-red-500+strokeWidth-2.5+mr-2]
PURPOSE:accessibility→non-readers-identify-by-red-mic
LOCATIONS:DiscussionDetailDialog|FeaturedBestieManager|SponsorBestieManager|BestieSponsorMessenger|GuardianSponsorMessenger|AlbumManagement|EventManagement|AudioRecorder
PATTERN:Button[variant=outline]+red-Mic+text
RATIONALE:red=record-association|larger-size=visibility|bold-strokes=clarity|consistency=familiarity
DOC:AUDIO_RECORDING_STANDARD.md

## BROWSER_COMPATIBILITY
CRITICAL:iOS-18.x-CSS-transform-rendering-bug→pages-disappear-on-load
DETECTION:src/lib/browserDetection.ts[getIOSVersion|isProblematicIOSVersion]
PATTERN:conditional-className+ErrorBoundary-wrapper
AFFECTED:iOS-18.0→18.7.1+[possibly-higher]
SOLUTION:avoid-inline-transform-styles+use-CSS-classes+conditional-application
SYMPTOMS:page-loads-briefly→disappears|rapid-horizontal-translations|content-shifts-off-screen|layout-thrashing
ROOT-CAUSE:Safari-iOS-18.x-bug[absolute-positioning+inline-transform+child-animations+transform-origin]
IMPLEMENTATION:
```tsx
import { isProblematicIOSVersion } from '@/lib/browserDetection';
import { ErrorBoundary } from '@/components/ErrorBoundary';
<div className={`absolute ${!isProblematicIOSVersion() ? '[transform:rotate(-8deg)] [will-change:transform] [backface-visibility:hidden]' : ''}`}>
  <ErrorBoundary fallback={null}><Component /></ErrorBoundary>
</div>
```
RULES:❌inline-style-transform-on-positioned-elements|✅CSS-classes-with-conditional-application|✅will-change+backface-visibility-for-iOS-optimization|✅ErrorBoundary-wrapper|✅test-on-actual-iOS-18.x-devices
PREVENTION:avoid-inline-transforms|use-Tailwind-arbitrary-values|consider-iOS-compatibility|test-multiple-iOS-versions
EXAMPLES:src/pages/Community.tsx[lines-333-345]|src/lib/browserDetection.ts
DOC:BROWSER_COMPATIBILITY.md|ERROR_HANDLING_PATTERNS.md[Browser-Compatibility-Patterns-section]|IOS_SIMULATOR_TESTING.md[testing-guide]
TESTING:use-Mac-IP-address-not-localhost|download-iOS-18.x-simulators-via-Xcode|verify-transform-conditionals-work|check-/community-DailyScratchCard
MAINTENANCE:update-isProblematicIOSVersion-when-new-iOS-versions-released|test-quarterly|document-new-issues

## IMAGE_CROP_DIALOG
COMP:ImageCropDialog[reusable-component]
FILE:src/components/ImageCropDialog.tsx
ASPECT-RATIOS:1:1|16:9|9:16|4:3|3:4|3:2|2:3
STANDARD-PATTERN:
  STATE:aspectRatioKey[useState-AspectRatioKey-type]
  PROPS:allowAspectRatioChange={true}|selectedRatioKey={aspectRatioKey}|onAspectRatioKeyChange={setAspectRatioKey}
USAGE-LOCATIONS:FeaturedBestieManager|FeaturedItemManager|SponsorBestieManager|BestieSponsorMessages|Discussions|EventManagement|Newsletter-RichTextEditor
FEATURES:drag-reposition|zoom-slider|aspect-ratio-selection|real-time-preview|CORS-safe
CRITICAL:ALWAYS-use-all-3-props-for-aspect-ratio-selection|NEVER-hard-code-aspectRatio-prop-when-selection-needed
EXAMPLE:
```tsx
const [aspectRatioKey, setAspectRatioKey] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3'>('16:9');
<ImageCropDialog
  open={cropDialogOpen}
  onOpenChange={setCropDialogOpen}
  imageUrl={imageToCrop}
  onCropComplete={handleCroppedImage}
  allowAspectRatioChange={true}
  selectedRatioKey={aspectRatioKey}
  onAspectRatioKeyChange={setAspectRatioKey}
  title="Crop Image"
  description="Select aspect ratio and adjust the crop area"
/>
```

## VISIBILITY_TOGGLE
PATTERN:Button[variant=outline+size=icon]|ACTIVE[green-Eye]|INACTIVE[red-EyeOff]
FILES:17-locations-use-pattern

## ADMIN_EDIT_BUTTON
PATTERN:Button[variant=outline+size=icon]+Edit-icon-only-NO-text
ICON:Edit[h-4-w-4]|Pencil[w-4-h-4]→both-acceptable-prefer-Edit-for-new
CRITICAL:ALWAYS-use-size=icon-NOT-size=sm|NO-text-label|include-title-prop-for-accessibility
LOCATIONS:FAQManager|GuideManager|TourManager|StickerCollectionManager|all-admin-list-views
EXAMPLE:
```tsx
<Button
  size="icon"
  variant="outline"
  onClick={() => handleEdit(item)}
  title="Edit item"
>
  <Edit className="h-4 w-4" />
</Button>
```
RATIONALE:icon-only=compact|consistent-admin-UI|title-prop=accessibility

## BACK_BUTTON
SPACING:main[pt-4-navbar|pt-6-no-navbar]|btn[mb-6]
STYLE:Button[variant=outline+size=sm]+ArrowLeft+"Back-to-[Dest]"

## NAV_BAR
VISIBILITY:role≠vendor→shows
SCROLL:shows[<150px|scroll-UP]|hides[>150px+scroll-DOWN]
CRITICAL:all-pages-pt-24[96px-clearance]
DB:navigation_links→realtime
ORDERING:top-level[display_order]→children[display_order-within-parent]
PARENT-LINKS:dropdown-parents-CAN-have-href[label-clicks→navigates|arrow→dropdown]|optional-href[empty→dropdown-only]

## FOOTER
OVERVIEW:database-driven-footer-with-fallback-defaults
DB:footer_sections[title+display_order+is_active]|footer_links[section_id+label+href+display_order+is_active]
COMP:Footer.tsx→loads-DB-sections-and-links→falls-back-to-hardcoded-defaults-if-empty
ADMIN:Admin→Format→Footer-tab→FooterLinksManager[CRUD-sections-and-links]
ROUTING:internal-links[href-starts-with-/]→use-Link-component|external-links[href-starts-with-http]→use-anchor-tag
CRITICAL:to-edit-footer-links→UPDATE-DATABASE-RECORDS-not-React-code
EXAMPLE:UPDATE-footer_links-SET-href='/newsletter'-WHERE-label='Newsletter'
FALLBACK:if-no-DB-records→displays-3-default-sections[About|Get-Involved|Connect]
REALTIME:footer-data-loads-on-mount→no-realtime-subscription
DISPLAY:3-column-grid-on-desktop|1-column-on-mobile|all-pages-site-wide

## NOTIF_BADGES
LOCATIONS:UnifiedHeader[Approvals-red|Admin-red|Bell-unread-count]|Admin-tabs|Guardian-tabs
FEATURES:red-destructive+realtime+auto-update+DELETE-events-immediate-refresh
REALTIME:separate-INSERT-UPDATE-DELETE-listeners→immediate-badge-updates-on-deletion
HOOKS:useNotifications|useContactFormCount|useGuardianApprovalsCount|useModerationCount|usePendingVendorsCount

## ERROR_HANDLING
COMPS:ErrorBoundary[catch-fallback-retry]|HeaderSkeleton[loading-prevent-shift]
HOOK:useRetryFetch[exp-backoff-3×]
PATTERN:Promise.allSettled+auto-retry+skeleton+boundary
FILES:ErrorBoundary.tsx|HeaderSkeleton.tsx|useRetryFetch.ts

## BESTIE_LINKING
FRIEND-CODE:3-emoji[20-set=8k-combos]|UUID-based-links-preserved
GUARDIAN:caregiver_bestie_links→3-emoji→search→role-verify→link+approval-flags
VENDOR:vendor_bestie_requests→guardian-approve→feature-ONE
SPONSOR:sponsorships+sponsorship_shares→Stripe→share-access
SECURITY:is_guardian_of()
RLS-CRITICAL:user_roles[SELECT-auth-required-for-role-verify]

## GUARDIAN_LINKS_PAGE
ROUTE:/guardian-links|ACCESS:caregiver+admin+owner
SECTIONS:Your-Besties[list]|Send-Messages-to-Sponsors[conditional]|My-Sponsorships[if-any]
ACCORDION-SECTIONS:
  Content-Moderation[always-visible]→require_post_approval|require_comment_approval|allow_featured_posts
  Vendor-Relationships[admin-only-badge]→require_vendor_asset_approval|show_vendor_link_on_bestie|show_vendor_link_on_guardian
  Sponsor-Communication[if-bestie-in-sponsor-program]→allow_sponsor_messages|require_message_approval
DB:caregiver_bestie_links|sponsor_besties[check-is_active]|sponsorships
CONDITIONAL-DISPLAY:
  Vendor-section[admin|owner-only]→Badge[Admin-Only]
  Sponsor-section[bestie-in-sponsor_besties-table]→check-is_active=true
  Send-Messages[any-linked-bestie-in-sponsor-program]→GuardianSponsorMessenger
STATE:bestiesInSponsorProgram[Set<string>]→loaded-on-mount→filters-accordion-visibility
COMPONENTS:GuardianFeaturedBestieManager|GuardianSponsorMessenger|SponsorMessageInbox|DonationHistory

## EVENTS
TYPES:single|recurring-multi|recurring-template
DISPLAY:upcoming|past|role-filter-client
CARD:AspectRatio+parse-9:16→9/16+TTS+LocationLink+AudioPlayer
DETAIL:EventDetailDialog+bypass-expiration-if-linked
DB:events|event_dates|event_attendees
RLS:SELECT[all-auth]|INSERT[auth]|UPDATE-DELETE[author-admin]

## SPONSORSHIP
OVERVIEW:monthly-recurring-sponsorships+guest-sponsors+tax-receipts+guardian-communication+funding-progress+Stripe-integration
PURPOSE:connect-sponsors-with-besties→monthly-donations→tax-deductible-receipts→progress-tracking→messaging
GUEST:no-account→sponsor_email→auto-link-on-signup→trigger[link_guest_sponsorships]
FUNDING:monthly_goal>0→SUM-active-monthly-sponsorships→progress-bar→VIEW[sponsor_bestie_funding_progress]
MSG-APPROVAL:require_message_approval→guardian-edit-caregiver_bestie_links→pending→approve→delivered

DATABASE:
  sponsor_besties[bestie_id|monthly_goal|is_active|stripe_mode]→defines-which-besties-available-for-sponsorship
  sponsorships[sponsor_email|user_id|bestie_id|amount|status|stripe_customer_id|stripe_subscription_id|tier_name]→active-sponsorships
  sponsorship_receipts[transaction_id|sponsorship_id|user_id|sponsor_email|amount|organization_name|organization_ein|receipt_number|tax_year|status|generated_at|sent_at|resend_email_id]→tax-receipts
  receipt_settings[organization_name|organization_ein|contact_email|is_501c3|enable_receipts|receipt_footer_text]→tax-exempt-org-info
  year_end_summary_settings[enable_summaries|summary_message|contact_email]→annual-giving-summaries
  sponsor_messages[bestie_id|sponsor_email|message|status|approval_status]→guardian-sponsor-communication
  caregiver_bestie_links[require_message_approval|allow_sponsor_messages]→guardian-approval-flags

VIEWS:
  sponsor_bestie_funding_progress→SUM-active-monthly-by-bestie-and-stripe-mode
  sponsorship_year_end_summary→annual-giving-totals-per-sponsor

EDGE-FUNCTIONS:
  create-sponsorship-checkout[POST]→Stripe-checkout-session→metadata[bestieId+tierName+amount+sponsorEmail]
  verify-sponsorship-payment[POST]→CRITICAL-IDEMPOTENCY-PATTERN→placeholder-receipt-INSERT→claim-transaction→create-sponsorship→update-receipt→send-email
  stripe-webhook[POST]→checkout.session.completed|subscription.updated|subscription.deleted→update-sponsorship-status
  manage-sponsorship[POST]→Stripe-customer-portal-URL→sponsor-can-update-payment-cancel
  update-sponsorship[POST]→change-tier-or-amount→prorate-Stripe-subscription
  send-sponsorship-receipt[POST]→generate-PDF-receipt→send-via-Resend→log-email
  generate-receipts[POST]→monthly-batch→previous-month-transactions→auto-generate-all-receipts
  generate-year-end-summary[POST]→annual-batch→previous-year-totals→send-summary-emails

CRITICAL-DUPLICATE-EMAIL-PREVENTION:
  FRONTEND-IDEMPOTENCY:SponsorshipSuccess.tsx→verificationInProgress-useRef→prevents-React-Strict-Mode-double-calls
  BACKEND-IDEMPOTENCY:verify-sponsorship-payment→INSERT-placeholder-receipt-FIRST→transaction_id-unique-constraint→claim-transaction→one-process-wins→only-one-email
  PATTERN:distributed-locking-via-database-constraint→INSERT-attempt→23505-error-code→early-exit→race-condition-eliminated
  RATIONALE:SELECT-then-INSERT-allows-race→INSERT-first-uses-DB-as-lock→guaranteed-single-email-per-transaction

WORKFLOWS:
  NEW-SPONSORSHIP:sponsor-page→select-bestie-tier→create-checkout→Stripe-payment→webhook→verify-payment→create-sponsorship→send-receipt-email
  GUEST-SPONSOR:no-account→enter-email→complete-payment→signup-later→trigger-links-guest-sponsorships
  UPDATE-TIER:manage-sponsorship→customer-portal→change-subscription→webhook→update-sponsorship-record
  CANCEL:manage-sponsorship→customer-portal→cancel→webhook→update-status[cancelled]→no-future-receipts
  MONTHLY-RECEIPTS:cron→generate-receipts→previous-month→all-active-sponsorships→batch-send
  YEAR-END:cron→generate-year-end-summary→previous-year→total-giving→summary-email

STRIPE-WEBHOOKS:
  checkout.session.completed→payment-success→verify-payment-creates-sponsorship
  subscription.updated→tier-change→update-amount-tier-status
  subscription.deleted→cancellation→update-status[cancelled]
  subscription.paused→pause→update-status[paused]
  subscription.resumed→resume→update-status[active]

FRONTEND-COMPONENTS:
  SponsorBestiePage→select-bestie-tier-amount→create-checkout
  SponsorshipSuccess→verify-payment-idempotent→display-confirmation→manage-link
  DonationHistory→user-sponsorships-receipts→download-PDF→view-history
  GuardianSponsorMessenger→send-messages-to-sponsor→require-approval-optional
  SponsorMessageInbox→sponsors-receive-messages→reply-to-guardian
  SponsorBestieDisplay→carousel-featured-besties→funding-progress→ALWAYS-LIVE-MODE-ONLY

RECEIPTS-SECURITY:
  CRITICAL-PRIVACY→users-see-ONLY-own-receipts→RLS[user_id-OR-sponsor_email-match]→explicit-filter[defense-in-depth]
  RECEIPTS-RLS→removed-admin-view-all-policy→NO-role-sees-all-receipts→privacy-protected
  RECEIPTS-QUERY→DonationHistory→explicit-filter[.or(user_id.eq+sponsor_email.eq)]→never-query-all
  TAX-INFO→receipt_settings[organization_ein|is_501c3]→required-for-tax-deductible-receipts
  AUDIT-TRAIL→transaction_id|resend_email_id|generated_at|sent_at→complete-audit-log

REALTIME:
  useGuardianApprovalsCount→pending-messages-badge→realtime-subscription
  useSponsorUnreadCount→unread-messages-badge→realtime-subscription

PAGES:
  /sponsor-bestie→public-page→select-bestie→create-sponsorship
  /sponsorship-success→post-payment→verify-payment→display-receipt-link
  /guardian-links→guardian-view→manage-besties→send-messages-to-sponsors
  /bestie-messages→sponsors-view→inbox→reply-to-guardians
  /guardian-approvals→guardian-approve-messages→pending-approval-tab

TRIGGERS:
  link_guest_sponsorships→runs-on-new-user-signup→matches-sponsor_email→links-sponsorships-to-user_id

STORAGE:
  app-assets→bestie-images-audio
  featured-bestie-audio→guardian-uploaded-audio-files

CRITICAL-CAROUSEL:
  SponsorBestieDisplay→ALWAYS-queries-LIVE-mode-only→hardcoded-stripe_mode='live'
  RATIONALE→public-display-shows-real-funding-regardless-of-app-mode-setting
  LOCATIONS→homepage|community|sponsor-page|support→all-use-same-LIVE-only-logic

SECRETS-REQUIRED:
  STRIPE_SECRET_KEY→Stripe-API-access
  RESEND_API_KEY→email-sending
  STRIPE_WEBHOOK_SECRET→webhook-signature-verification

TESTING:
  email-sponsorship-receipts.spec.ts→Playwright-E2E-tests
  TEST-ACCOUNT→persistent-test-accounts-NOT-cleaned-up
  CLEANUP→cleanup-test-data-unified→email-prefix[emailtest-]

DOC:SPONSORSHIP_RECEIPT_SYSTEM_COMPLETE.md|SPONSOR_PAGE_SYSTEM.md|EDGE_FUNCTIONS_REFERENCE.md

## VENDOR_BESTIE
OVERVIEW:vendors-display-approved-bestie-content-on-profile
DB:featured_besties|vendor_bestie_requests|vendor_bestie_assets
NOTE:vendor=status-not-role

## ABOUT_PAGE
ROUTE:/about|SECTIONS:Our-Story|Documentary|BDE
DB:homepage_sections[key:about+JSONB]
DESIGN:Documentary[outline-white]|BDE[solid-brown-NO-gradient-HSL]

## ADMIN_DASH
ROUTE:/admin|ACCESS:admin-owner|REDIRECT:non-admins→/community
TABS:Analytics|Users|Events|Albums|Videos|Besties[subs:Featured+Sponsors+Page+Content+Receipts+Trans+YE-Settings+History]|Partners|Donations|Featured|Vendors[badge-subs:Vendors+Products+Orders]|Format[subs:Homepage+Community+About+Footer+Quick+Nav+Locations]|Moderation[badge-subs:Content+Messages+Policies]|Contact[badge]|Help[subs:Tours+Guides+FAQs]|Updates|Notifications|Settings[subs:App+Stripe-Mode+Social-Sharing+Static-Meta+Avatars+TTS+Coins+Store+Pet-Types+Locations+Impersonation]
STRIPE-MODE:Settings→Stripe-Mode-tab→StripeModeSwitcher[test|live-toggle]|MOVED-from[/guardian-links+/sponsor-bestie]
CONTENT-MODERATION:Posts-tab[posts-only]|Comments-tab[comments-only]|cascade-delete-warnings[posts→comments]
DOC:CONTENT_MODERATION_CASCADE_DELETES.md

## AUTH
ROUTE:/auth
SIGNUP:email-pwd-name-role+avatar→signUp→handle_new_user()→record-terms-IMMEDIATE→redirect
LOGIN:signInWithPassword→check-vendor→redirect
ROLES:supporter|bestie|caregiver|moderator|admin|owner
AVATAR:1-12→composite-{n}.png
TERMS:Guard+Dialog→versions-in-useTermsCheck→FIXED-2025-10-25[no-double-prompt]
EDGE:record-acceptance[auth-required|IP-tracking+audit-trail]→called-DURING-signup
SECURITY:handle_new_user()[DEFINER]|has_role()[DEFINER]
RLS:profiles[own+guardians-linked+admins-all]|user_roles[SELECT-auth|INSERT-UPDATE-DELETE-admins]
DOC:AUTH_SYSTEM_CONCISE.md|CHANGELOG_2025_10_25.md

## BUTTON_STYLING
VARIANTS:default[gradient-CTAs]|outline[border-secondary]|secondary[solid-supporting]|ghost[transparent-tertiary]
GRADIENT:✅brand-CTAs|✗custom-colors-secondary-outline-ghost
CUSTOM:ghost+bg-hsl+hover→solid-custom-NO-gradient
GRADIENT-DEF:--gradient-warm[5-radial-burnt-orange]
SIZES:sm|default|lg[Hero]|icon

## COFFEE_SHOP
ROUTE:/coffee-shop
DB:app_settings.coffee_shop_content[JSONB]
ADMIN:edit-hero|mission|buttons|location|menu-toggle
FRONTEND:Hero|Mission|Hours|Menu[conditional]

## COMMUNITY_PREVIEWS
CRITICAL:fetch-profiles_public[role]→effectiveRole→loadContent
DISCUSSION:is_moderated=true-NO-approval_status→limit-1
EVENTS:is_public+is_active→client-filter-roles→date-logic→height-limit-1200px
GRID:grid-cols-1-lg:2-gap-6
CARDS:Discussion[MessageSquare+TTS]|Event[Calendar+aspect+location-link+audio+TTS]
TTS:stopPropagation|Discussion[title+content]|Event[title+desc+date+location]
CRITICAL-RULES:7-rules→profiles_public|is_moderated-only|client-filter|height-limit|stop-propagation|visibility-check|empty-states

## EMAIL_TESTING
OVERVIEW:test-categories[approvals|digest|contact-form|messages|notifications|sponsorship-receipts]→patterns[seed-test-data→trigger-email→wait-DB-state→verify-NOT-email-capture]→cleanup[afterAll]
FILES:email-approvals.spec.ts|email-digest.spec.ts|email-contact-form-resend.spec.ts|email-messages.spec.ts|email-notifications.spec.ts|email-sponsorship-receipts.spec.ts
CLEANUP:cleanup-email-test-data[edge-func]→delete-test-users-by-email-prefix→cascade-deletes-all-related-data→called-in-afterAll-hook
OPTIMIZATION:Chromium-only-CI[3x-faster]|6-shards[vs-8]|30s-timeout[vs-60s]|0-retries[vs-1]|global-teardown[once-not-per-test]→34min→8-10min
PERF-DOC:TEST_PERFORMANCE_OPTIMIZATION.md[70%-faster|defense-layers|best-practices]
EDGE:seed-email-test-data[creates-test-users+data]|cleanup-email-test-data[deletes-test-users+cascade]
HELPERS:tests/utils/resend-test-helper.ts[waitForSubmission|waitForReply|simulateInboundEmail|cleanupTestSubmissions]
CI:.github/workflows/email-tests.yml[seed→test→cleanup]
PERF:single-query-pattern[contact-forms]|client-side-filtering|prevent-timeout-errors
CRITICAL-SCHEMA:contact_form_submissions|contact_form_replies|notifications|email_notifications_log|digest_emails_log|sponsorship_receipts
VERIFICATION:DB-state[NOT-email-capture]|check-logs-tables|verify-notifications-created

## CONTACT_FORM
DB:contact_form_settings|contact_form_submissions|contact_form_replies
FRONTEND:ContactForm[auto-load-settings+validate-Zod+save-DB+email-optional-graceful]|ContactSubmissions[unified-modal-2025-11-04]|MessagesManager[admin-messages]
VALIDATION:client-Zod|server-edge
EDGE:notify-admin|send-reply|process-inbound-email
NOTIFICATIONS:contact_form_submission[new-submissions]|contact_form_reply[user-replies]
BADGE:useContactFormCount→new-submissions+unread-replies→realtime+single-query-optimization|useMessagesCount[admin-messages]
PERFORMANCE:single-query-pattern[fetch-all-replies-once]|client-side-filtering[JS-Map]|prevents-timeout-errors
UNIFIED-MODAL[2025-11-04]:view+reply-combined→single-dialog→original-message+history+compose-together
UI-PATTERNS:numeric-dates[M/d/yy]|truncated-subjects[200px+tooltip]|primary-reply-btn[badge-if-unread]|more-dropdown[view+status+delete]
TABLE:[checkbox][red-dot][date][name][subject][type][source][status][actions]
MODAL:original[muted-bg+metadata]|history[scrollable+color-coded]|reply-form[always-visible+admin-notes]
UI-INDICATORS:red-dot[new-OR-unread-replies]|reply-button-badge[unread-count]|clear-on-open-dialog
CLOUDFLARE:email-routing→worker→process-inbound-email→auto-thread+notify+system-email-filter
REPLY:auto[CloudFlare-routing]|manual[admin-interface]
SETUP:Resend[verify-domain-SPF-DKIM]+CloudFlare[email-routing+worker+webhook-secret]
REALTIME-UPDATES[NOV-2025]:latest-activity-sorting|instant-badge-updates|red-dot-fix|1-second-timestamp-buffer|replied_at-update-on-view
DOC:CONTACT_FORM_SYSTEM.md|CONTACT_FORM_NOTIFICATIONS.md|CONTACT_SUBMISSIONS_UI_GUIDE.md[exhaustive]|CLOUDFLARE_EMAIL_ROUTING_SETUP.md|CONTACT_MESSAGES_REALTIME_UPDATES.md[NOV-2025-CHANGES]

## DISCUSSION
ROUTE:/discussions
DB:discussion_posts[created_at+updated_at]|discussion_comments[created_at+updated_at]
PERMS:posts[guardians-admins-owners]|comment[all-auth]|edit-post[author-guardian-admin]|edit-comment[author-only]|change-author[owners]
APPROVAL:bestie→check-require_post_approval→pending→guardian-approve
MODERATION:text[moderate-content]|image[moderate-image-policy]
EDGE:moderate-content[auth-required|Lovable-AI-text]|moderate-image[auth-required|Lovable-AI-vision]
MEDIA:images[4.5MB-crop]|videos[select-or-YT]|albums[link]|events[link]|audio[comments]
UI:DiscussionPostCard[list-card-16:9-media-preview]|DiscussionDetailDialog[full-post-comments-edit]
EDIT:posts[open-create-form-pre-filled]|comments[inline-textarea-save-cancel]
EDITED-INDICATOR:(edited)→shows-if[updated_at>created_at+60s]
AUDIO-RECORDING:red-microphone-standard[w-5-h-5+text-red-500+strokeWidth-2.5]→accessibility
ROLE-BADGE:UserCircle2-icon+bg-primary/10+border-primary/20+text-primary+capitalize
REALTIME:subscribe-posts+comments
RLS:SELECT[approved-visible-or-own-pending]|UPDATE[author-guardian-admin-for-posts|author-only-for-comments]|INSERT[guardians-admins]
VALIDATION:title[1-200]|content[1-2000]|image[20MB]

## DIALOG_BUTTON_STANDARD
LAYOUT:flex-items-start-gap-3[content-flex-1-min-w-0|buttons-flex-shrink-0]
DELETE:ghost-icon-Trash2-w-5-h-5-destructive-hover
CLOSE:ghost-icon-X-w-5-h-5-hover-bg-accent
APPLICABLE:content-view-dialogs[NOT-form-dialogs-with-footer-actions]
COMPONENTS:DiscussionDetailDialog[delete+close]|EventDetailDialog[close]|GuideViewer[close]|SponsorshipBreakdownDialog[close]
NOT-APPLICABLE:forms[ImageCrop|PasswordChange|ReportIssue]|special[ImageLightbox-fullscreen]
TESTS:discussions.spec.ts-button-alignment|visual.spec.ts-Percy
DOC:DIALOG_BUTTON_STANDARD.md

## DONATION
ROUTE:/support
DB:donations[CRITICAL-CONSTRAINT-must-allow:pending+completed+active+cancelled+paused]
WORKFLOW:select-frequency+amount→email→terms→Stripe→success
GUEST:donor_email→link-on-signup
EDGE:create-donation-checkout[creates-pending]|stripe-webhook[updates-to-completed-or-active]
STATUS:One-Time[pending→completed]|Monthly[pending→active→cancelled]
STRIPE-IDS:stripe_customer_id[ALWAYS-set-both-types]|stripe_subscription_id[ONLY-monthly]
FEE-COVERAGE:(amt+0.30)/0.971
ADMIN:SponsorshipTransactionsManager[shows-donations+sponsorships]
ACTIONS:copy-customer-id|open-stripe-customer|view-receipt-logs|delete-test
RECEIPT-STATUS:green-FileText[generated]|yellow-Clock[pending]
AUDIT-LOGS:accessible-for-both-donations+sponsorships[NOT-restricted]
CRITICAL-BUG:constraint-must-include-pending+completed→silent-failure-if-missing
DIFFERENCES:vs-sponsorships[purpose|recipient|metadata:type='donation'|table|UI|receipts|year-end]
DOC:DONATION_SYSTEM.md

## HELP_CENTER
ROUTE:/help
DB:help_tours|help_guides|help_faqs
STEP-FORMAT:[{target+content+title+placement+disableBeacon:true}]
WORKFLOWS:Browse[tabs-search-filter]|Tour[navigate-overlay-?tour=xxx]|Guide[dialog]|FAQs[accordion]
ADMIN:Tours[JSON-steps]|Guides[markdown]|FAQs[Q+A]
TOUR:?tour=xxx-preserved|disableBeacon:true-all|150px-offset|5s-timeout|cleanup
RLS:SELECT[active-all]|ALL[admins]

## ORDER_TRACKING
DB:order_items[tracking+carrier+fulfillment_status]|orders
EDGE:submit-tracking[vendor-auth+AfterShip-API]|aftership-webhook[⚠️NOT-FUNCTIONAL]
FRONTEND:VendorOrderDetails[input-tracking]|OrderHistory[display-tracking]
CONFIG:AfterShip-API[AFTERSHIP_API_KEY]
STATUS-COLORS:pending-yellow|shipped-blue|delivered-green|completed-green|cancelled-red

## TERMS_PRIVACY
DB:terms_acceptance[user+versions+IP+user-agent+UNIQUE]
VERSION:useTermsCheck.ts[CURRENT_TERMS_VERSION-1.0+CURRENT_PRIVACY_VERSION-1.0]
COMPS:Dialog[non-dismissible+checkbox]|Guard[wraps-App+hides-public]|useTermsCheck
EDGE:record-acceptance[auth+IP+user-agent]→called-IMMEDIATELY-after-signup
WORKFLOWS:Signup[checkbox→record-immediate→no-second-dialog✓]|Update[version-change→dialog]|Guest[sponsor→signup→dialog]
SECURITY:audit-trail-IP-timestamp|non-dismissible|unique-constraint|edge-adds-metadata
FIXED-2025-10-25:double-terms-prompt-eliminated→record-during-signup-not-deferred


## SPONSOR_PAGE
ROUTE:/sponsor-bestie?bestieId=xxx
FEATURES:dynamic-ordering|URL-param|role-block-besties|Stripe
SECTIONS:header|featured_video|carousel|selection_form|impact_info[ordered-by-display_order]
DISPLAY:SponsorBestieDisplay[carousel-7s+TTS+audio+funding+controls-inside-card]
DB:sponsor_besties|sponsor_page_sections|sponsor_bestie_funding_progress_by_mode-VIEW
ADMIN:Manager[CRUD]|PageOrder[drag-drop-dnd-kit]|PageContent[edit-header]
RULES:URL[?bestieId→move-top]|role[besties-cant-sponsor]|funding[if-goal>0]|carousel[pause-on-nav-TTS]
STRIPE:create-checkout→session→URL
WORKFLOW:guardian-creates→vendor-links→guardian-approves→vendor-requests-asset→guardian-approves→displays
DISPLAY:2-col-grid[asset|bestie-name-desc-TTS]
CRITICAL-STRIPE-MODE:carousel-ALWAYS-shows-LIVE-sponsorships→.eq('stripe_mode','live')→never-respects-app-mode-setting→public-facing-must-show-real-data
LOCATIONS:homepage|community|sponsor-page|support→all-use-same-LIVE-only-logic

## COMMUNITY_PREVIEW_SECTIONS
GRID:1-col-mobile|2-col-desktop-gap-6
LATEST-DISCUSSION:MessageSquare|card[img-or-video-thumb+title-TTS+desc+meta]|query[is_moderated=true-NO-approval]
UPCOMING-EVENTS:Calendar|card[dynamic-aspect+title-TTS+desc+meta+location-link+audio]|query[is_public+is_active]|role-filter-CLIENT|date-logic[collect+filter+sort-limit-3]|height-limit-1200px
TTS:right-of-title-stopPropagation|Discussion[title+content]|Event[title+desc+date+location]
NAV:card-click→route[except-TTS-location-audio-stopProp]
CRITICAL:7-rules[profiles_public|is_moderated-only|client-role-filter|height-1200|stop-prop|visibility-check|empty-states]

## SENTRY_ERROR_LOGGING
OVERVIEW:capture-errors→Sentry→webhook→error_logs-table→admin-Issues-tab
DB:error_logs[error_message|type|stack|user|browser|url|sentry_event_id|severity|env|metadata]
EDGE:sentry-webhook[receive-alert→parse→insert-db]
FRONTEND:ErrorLogsManager[list-filter-search-by-type-user-severity]|ErrorBoundary[catch-log-retry]
WORKFLOW:1)Sentry-catch→2)alert-webhook→3)log-DB→4)admin-view
SETUP:Sentry-dashboard[Alerts→WebHooks→add-edge-URL]
FIELDS:error_message|type|stack_trace|user_id|user_email|browser_info|url|sentry_event_id|severity|environment|metadata|created_at

## STICKER_PACK_SYSTEM
OVERVIEW:daily-free-packs+purchasable-bonus-packs+rarity-based-drops+animated-pack-opening+collection-progress+duplicate-tracking
DB:sticker_collections|stickers|daily_scratch_cards|user_stickers|badges
EDGE:scratch-card[opens-pack→determines-rarity→reveals-sticker]|purchase-bonus-card[exponential-pricing→deduct-coins→create-bonus-card]|reset-daily-cards[admin-only+scope:self|admins|all]
COMPONENTS:PackOpeningDialog[tear-animation+holographic-effects+rarity-confetti+AUDIO:pack-reveal-on-open+rarity-sound-on-tear]|DailyScratchCard[community-widget+realtime-updates]|StickerAlbum[full-view+purchase+progress]
RARITY:common[50%]|uncommon[30%]|rare[15%]|epic[4%]|legendary[1%]→configurable-per-collection
PACKS:daily-free[1/day-MST-reset]|bonus[purchasable-exponential:100→200→400→800-coins]
FEATURES:duplicate-detection+quantity-tracking+collection-completion-badges+role-based-visibility+custom-pack-images
TIMEZONE:MST-UTC-7→midnight-reset→date-field-YYYY-MM-DD
REALTIME:supabase-subscription→instant-state-updates→filter-by-user_id
RLS:users-view-own-cards+scratch-own-cards|admins-manage-all
ANIMATION:tear-effect+holographic-shimmer+sparkles+rarity-based-confetti
AUDIO:sticker_pack_reveal[plays-once-on-dialog-open→useRef-pattern]|rarity-sounds[play-after-tear→different-per-rarity]
ADMIN:StickerCollectionManager[CRUD-collections+stickers+rarity-config+preview-test+reset-daily-cards-dialog]
RESET:admin-dialog→choose-scope[Only-Me|All-Admins-Owners|All-Users-confirm]→delete-cards-by-scope
DOC:STICKER_PACK_SYSTEM.md

## NEWSLETTER_SYSTEM
OVERVIEW:email-campaigns+automated-templates+subscriber-management+analytics+testing+comprehensive-logging
DB:newsletter_campaigns|newsletter_subscribers|newsletter_analytics|newsletter_templates|campaign_templates|newsletter_links|newsletter_emails_log|newsletter_drip_steps
EDGE:send-newsletter[admin+campaign+subscribers→resend]|send-test-newsletter[admin+self-email]|send-test-automated-template[admin+test-template]|send-automated-campaign[trigger-based]
FRONTEND:NewsletterManager[7-tabs:Campaigns|Automated|Templates|Email-Log|Subscribers|Analytics|Settings]|NewsletterSignup[compact-widget|full-page+redirect]
TABS:Campaigns[manual-campaigns+draft-scheduled-sent]|Automated[trigger-templates+log]|Templates[reusable-content]|Email-Log[sent-tracking]|Subscribers[manage-list]|Analytics[open-click-rates]|Settings[header-footer-org]
CAMPAIGNS:create→edit-rich-text→preview→test-send→schedule→send→track
AUTOMATED:create-template→set-trigger[welcome|anniversary|etc]→auto-send-on-event
TEST:any-campaign-or-template→send-to-logged-in-admin→test-notice-banner
LOGGING:newsletter_emails_log[campaign_id|template_id|recipient_email|recipient_user_id|subject|html_content|status|error_message|resend_email_id|metadata]
EMAIL-LOG-UI:search-by-email|filter-by-status[sent|failed|bounced]|view-details-dialog[full-email-content+metadata]|pagination
RICH-EDITOR:tiptap[formatting|images|links|alignment]|image-crop-dialog[aspect-ratio-selection]
HEADER-FOOTER:reusable-header-footer→enabled-toggle→inject-into-emails
TRACKING:link-tracking[short-codes]|open-tracking[pixel]|click-analytics|resend-webhook-skips-non-campaign-emails
RLS:admins-only-campaigns-templates|anyone-subscribe|admins-view-logs
MOBILE:tab-bar-wraps[inline-flex+flex-wrap+whitespace-nowrap]
SIGNUP-FLOW:header-btn→/newsletter-page→form→success-toast→auto-redirect-home-1.5s
FIXED-2025-10-25:landing-page-redirect-after-signup→improves-UX→user-knows-signup-complete
DOC:NEWSLETTER_SYSTEM.md

## TEST_ANALYSIS_WORKFLOW
MANDATORY:output-PRE-ANALYSIS-CHECKLIST-before-any-conclusions
PRE-CHECKLIST:
```
□ Parsed ALL test logs [not-summary]
□ Listed EVERY failing test [file+line+error]
□ Searched codebase ≥10× for context
□ Read EVERY test file in logs
□ Read EVERY component referenced in tests
□ Verified claims vs actual code
□ Created comparison table [test-expect vs actual-code]
□ Documented patterns across failures
□ Proposed fixes [file:line references]
□ Ready: [yes/no]
```
STEPS:1)parse-complete-logs→2)search-read-minimum-10-files→3)read-implementation-code→4)create-comparison-table[test-vs-code]→5)verify-with-quotes→6)document-patterns
COMPARISON-TABLE-REQUIRED:Test-File+Line|Test-Expects|Code-Actually-Has|Match[YES/NO]|Root-Cause|Proposed-Fix[file:line]
NEVER:assumptions-without-verification|claim-comprehensive-with-<10-reads|conclusions-before-reading-full-files|claim-features-missing-without-reading-components
ALWAYS:quote-actual-code-proving-claims|read-complete-files-not-excerpts|search-patterns-across-tests|verify-selectors-exist-in-rendered-output
CONSEQUENCES:lazy-analysis→wrong-conclusions→wasted-user-time→lost-trust→multiple-correction-rounds
CORRECT-APPROACH:output-checklist→read-logs→search-10+×→read-all-test-files→read-all-components→compare-table→verify-quotes→document-patterns→present-findings
WRONG-APPROACH:❌read-summary-only❌search-2-3×-claim-done❌assume-without-verify❌skip-implementation-code❌no-file:line-refs
IF-USER-SAYS:"not-thorough"→YOU-WEREN'T|"that-exists"→YOU-MISSED-IT|"search-more"→YOU-DIDN'T-SEARCH-ENOUGH

## TEST_PHILOSOPHY
CRITICAL-RULES:fix-root-cause-never-skip|document-all-learnings|tests-must-pass-or-fail|address-preconditions-immediately
APPROACH:test-skip→investigate-why→fix-precondition[seed-data|feature|environment]→throw-error-if-missing→document-fix
NEVER:skip-to-pass-CI|hide-broken-features|accept-missing-preconditions|arbitrary-skips|test-dependencies
ALWAYS:throw-errors-for-missing-preconditions|fix-seed-functions|implement-or-remove-features|make-tests-independent|document-every-fix
SKIPPED-TESTS:zero-acceptable|either-PASS-or-FAIL|skips-hide-real-problems|decay-over-time
PRECONDITIONS:missing-seed→fix-seed-email-test-data|feature-missing→fix-selector-or-implement|dependencies→make-independent
DOCUMENTATION:every-fix→TEST_FIXES-doc|root-cause|solution|prevention-pattern
RATIONALE:skips-hide-bugs|tests-decay|false-security|expose-dont-hide
ANALYSIS-PROCESS:TEST_ANALYSIS_PROCESS.md[7-step-systematic-approach]→parse→root-cause→search-context→propose-solutions→document→implement→update
DOC:TEST_SKIP_PHILOSOPHY.md[zero-skips-approach]|TEST_FIXES_2025_10_23.md[recent-fixes]|TESTING_BEST_PRACTICES.md[guidelines]|TEST_ANALYSIS_PROCESS.md[analysis-workflow]

## AUTOMATED_TESTING
OVERVIEW:Playwright-E2E-tests→GitHub-Actions→webhook→test_runs-table→admin-Testing-tab
TEST-ACCOUNT:test@example.com|testpassword123|REQUIRED-for-auth-pages
PERSISTENT-TEST-ACCOUNTS:testbestie@example.com|testguardian@example.com|testsupporter@example.com|PROTECTED-from-cleanup|use-for-role-testing
EDGE:create-persistent-test-accounts[admin|create-verify]|cleanup-test-data-unified[test|exclude-persistent]
DB:test_runs[status|workflow|commit|branch|duration|url|test_count|passed|failed|skipped|error|metadata]
EDGE:github-test-webhook[receive-GH→parse→insert-db]|cleanup-test-data-unified[email+E2E-cleanup]
FRONTEND:TestRunsManager[list-realtime-status-badges-links-to-GH-clean-button]
WORKFLOW:1)push-code→2)GH-Actions-run→3)webhook-log→4)admin-view→5)cleanup-button
SETUP:GH-secrets[VITE_SUPABASE_URL+VITE_SUPABASE_PUBLISHABLE_KEY+PERCY_TOKEN]
TESTS:playwright.config.ts|17-E2E-files[basic|auth|navigation|community|forms|guardian-approvals|guardian-linking|sponsorship|store|vendor-linking|discussions|events-interactions|shopping-cart|notifications|video|help-center|performance]|3-browsers[Chrome-Firefox-Safari]
VISUAL:Percy-24-snapshots[desktop-9|mobile-6|tablet-5]|@percy/cli|npx-@percy/cli-exec|PERCY_TOKEN-secret|viewport-simulation[FREE-vs-paid-mobile-browsers]|auto-login[community-events-store-discussions]|public-pages[homepage-auth-support-help-NO-login]
PERFORMANCE:@slow-tag|load-times[<5s-pages|<6s-images]|core-web-vitals[LCP<4s|CLS<0.25]|resource-checks
STATUSES:success✅|failure❌|pending⏱|cancelled🚫
RUN-LOCAL:npx-playwright-test|--ui[interactive]|show-report[view-results]|--grep-@slow[performance]|--grep-@fast[default]
E2E-COVERAGE:
TESTS:basic|auth|navigation|community|forms|guardian-approvals|guardian-linking|sponsorship|store|vendor-linking|discussions|events-interactions|shopping-cart|notifications|video|help-center|performance
SPONSORSHIP-REGRESSION:LIVE-funding-display→catches-carousel-showing-$0-for-LIVE-sponsorships-when-app-in-TEST-mode
TAGS:@fast[default-60s-timeout]|@slow[performance-tests]
E2E-RELIABILITY-PATTERNS:
LAYERED-WAITS:tab-click→section-heading-wait-15s→component-title-wait-10s→button-wait-5s
SELECTORS:verify-component-code→exact-text-NOT-generic-patterns
TAB-CONTENT:ALWAYS-wait-for-specific-content-within-tab-NEVER-waitForTimeout
CRITICAL:waitForSelector[specific-targets]+exact-component-text+layered-waits=stable-tests
CLEANUP:cleanup-test-data-unified[email+E2E]→emailPrefix[emailtest-{testRunId}]|namePatterns[Test+E2E]→19-table-cascade→delete-users
NAMING:Test-prefix|E2E-prefix|test@-email→auto-cleanup
HELPERS:markAsTestData|generateTestName|cleanupTestData|setupCleanupGuard[retry-logic]
MANUAL:Admin→Testing-tab→Clean-Test-Data-button
DOC:TEST_DATA_CLEANUP.md|TEST_DATA_CLEANUP_CRITICAL.md|EMAIL_TESTING_SYSTEM_COMPLETE.md|TESTING_BEST_PRACTICES.md|TEST_ANALYSIS_2025_10_22.md|TEST_FIXES_2025_10_22.md
CRITICAL-PRIORITY:cleanup-reliability>test-pass-rate|3-defense-layers[defensive-filter+enhanced-cleanup+retry-logic]
DEFENSIVE-FILTERING:SponsorBestieDisplay+FeaturedBestieDisplay→filter-out-test-names-BEFORE-display
TEST-LEAKAGE-PREVENTION:sponsor-besties-MUST-NOT-show-in-carousel|featured-besties-MUST-NOT-show-on-homepage|afterEach-hooks-MORE-reliable-than-afterAll
BEST-PRACTICES:60s-timeout-auth-flows|handle-empty-states|role-based-selectors|email-tests-separate-workflow
CRITICAL-LEARNINGS:45s-timeout-insufficient-CI|auth-flows-need-intermediate-waits|content-may-not-exist|email-tests-need-service-key
FIXES-APPLIED:TEST_FIXES_2025_10_23.md[jest-dom-added|selector-syntax-fixed|timeouts-increased-60s|contact-form-defensive-checks|35-tests-unblocked]

## INTERNAL_PAGES
FILE:lib/internalPages.ts
PURPOSE:registry-all-routes-for-admin-dropdowns
STRUCTURE:{value:route+label:name}
PAGES:public|community|sponsorship|marketplace|user|guardian-bestie|help|admin
CRITICAL:add-route-App.tsx→MUST-add-registry→auto-in-dropdowns
MAINTENANCE:sync-routes|descriptive-labels|alphabetize|no-external

## NOTIFICATION_SYSTEM
OVERVIEW:dual[in-app+email]+prefs+realtime+grouped+rate-limit+expiry-30d
DB:notifications|rate_limits|notification_preferences|digest_emails_log|email_notifications_log
FUNCS:get_prefs|get_needing_digest|check_rate_limit|cleanup_limits|cleanup_expired
TRIGGERS:6-triggers[comment|pending|approval|sponsor-msg|msg-status|sponsorship]→rate-limited-1/hr
EDGE:send-email|send-digest|broadcast-update
FRONTEND:Bell[badge-popover]|List[scrollable-400px-grouping]|NotificationCenter[/notifications-page]
HOOKS:useNotifications[notifications+grouped+unread+methods+realtime-INSERT-UPDATE-DELETE+cleanup]
REALTIME:separate-event-listeners[INSERT|UPDATE|DELETE]→immediate-badge-updates-on-any-change
GROUPED:rules[by-type+target]|UI[single-or-count-badge+expand]
RATE:1/endpoint/user/hr|window-60min|cleanup->1hr
EXPIRY:30d-TTL|cleanup-daily-cron
DIGEST:daily-weekly|50-unread|grouped-by-type|cron[8AM-daily|8AM-Mon-weekly]
TYPES:11-types[pending|approval|sponsor-msg|msg-status|sponsorship|sponsorship-update|event|event-update|comment-post|comment-thread|product-update]
DOC:NOTIFICATION_SYSTEM_COMPLETE.md|NOTIFICATION_BADGES_CONCISE.md|NOTIFICATION_CENTER_PAGE.md

## VENDOR_SYSTEM
CHANGE-2025-10-08:vendor=STATUS-not-role
BENEFIT:guardians-manage-bestie+one-account-multiple-capabilities
DB:vendors[status-pending-approved-rejected-suspended]|products
EDGE:submit-tracking[vendor-auth|AfterShip-API]|aftership-webhook[webhook|NOT-FUNCTIONAL]
FLOWS:apply[/vendor-auth→signup→pending→admin-approve→approved]|check[supabase.from-vendors.select-status]|dash[tabs:Products+Orders+Earnings+Payments+Settings]
EXAMPLES:caregiver+vendor|bestie+vendor|supporter+vendor

## FEATURED_ITEM
OVERVIEW:carousel-homepage-community-role-visibility
COMPS:FeaturedItem[auto-10s+pause-play+nav+aspect+TTS+event-details]|Manager[CRUD-crop-link-order-visibility]
DB:featured_items[aspect-def:16:9]
LOAD-OPTIMIZED:parallel[auth+items-Promise.all]→filter-client→resolve-URL
LINK:internal[/route|event:uuid|album:uuid|post:uuid]|external[https]
VISIBILITY:non-auth[public-only]|auth[public-or-roles]|admin[all]
CAROUSEL:auto-10s|pause[nav-user]|resume[play-btn]|dots
EVENT-DETAILS:event:uuid→fetch-event+saved_locations→display[Calendar-Clock-MapPin+format]

## SEO_PERF
SEO:SEOHead[title|desc|image|type|noindex|canonical|structuredData]|structured[Org|Article|Event-Schema.org]
SITEMAP:edge-generate-sitemap[static+posts+events+albums+vendors-XML-1k-limit]
IMAGE-OPT:OptimizedImage[lazy-except-priority+Intersection-50px-before+blur-placeholder+fade]
PERF:preconnect-fonts|preload-favicon|theme-color|compress-5MB-1920px|code-split-lazy
BEST-PRACTICES:meta[<60-title|<160-desc|keywords-natural|unique]|structured[schema.org|required-props|test]|image[descriptive-names|alt-always|lazy-below-fold]
MONITORING:Search-Console|PageSpeed|Lighthouse|Schema-Validator|Rich-Results-Test
METRICS:LCP<2.5s|FID<100ms|CLS<0.1|TTI<3.5s

SOCIAL-SHARING-ISSUE:
PROBLEM:SEOHead-updates-client-side[JS]→crawlers-NO-execute-JS→see-only-index.html-static-tags
SOLUTION:1-clear-cache[Facebook-Debugger|Twitter-Validator|LinkedIn-Inspector]|2-update-index.html[static-default-tags]|3-add-?v=2-to-URLs
GUIDE:Admin→Settings→Social-Sharing→SocialSharingGuide[tools+instructions+tips]
CACHE:7-30-days-platforms|force-refresh-via-debugger-tools
IMAGE-REQS:Facebook[1200x630]|Twitter[800x418]|LinkedIn[1200x627]|min-200x200

## SAVED_LOCATIONS
DB:saved_locations[name+address+is_active]
COMPS:Manager[Admin→Format→Locations-CRUD-toggle]|Autocomplete[dropdown-saved+Google-Places+manual]
WORKFLOWS:admin[create-toggle]|user[select-saved-or-Google-or-manual]
INTEGRATION:EventManagement[LocationAutocomplete]|display[match-saved→show-name-bold+address-link]
GOOGLE:API-key-GOOGLE_PLACES_API_KEY|edge-get-key|fallback[saved+manual-still-work]
DESIGN:dropdown[[MapPin]-name-address-muted]|input[[MapPin]-address]|card[[MapPin]-name-address-[Eye]]
RLS:SELECT[all-auth-active]|INSERT-UPDATE-DELETE[admins]

## SOCIAL_SHARING
COMPS:ShareButtons[mobile-Native-Share-API+desktop-platform-btns+compact-dropdown]|ShareIconButton[compact]
PLATFORMS:Twitter|Facebook|LinkedIn|WhatsApp|Email|Copy[Clipboard-toast]
IMPL:discussions[post-header-compact]|events[card-compact-if-public]|event-dialog[expanded-if-public]
UI:desktop[Twitter-Facebook-LinkedIn-Copy]|mobile[Native-Share]|compact[dropdown]
NATIVE:if-navigator.share|mobile-Safari-Chrome|desktop-no-support
SEO:works-with-SEOHead[og:*|twitter:*]→rich-previews
BEST:absolute-URLs|<150-desc|2-3-hashtags-no-#|toast-on-copy
VISIBILITY:public-only[is_public=true]|role-based[visible_to_roles]

## VENDOR_AUTH
OVERVIEW:ANY-auth-user-apply-vendor
FLOW:route:/vendor-auth|new[signup→supporter+vendors-pending]|existing[signin→check-vendor-rec]
ALT-ENTRY:Marketplace-Become-Vendor-btn
CHECK:supabase.from-vendors.select-status.eq-user_id|if-approved-access-features
DIFF:OLD[vendor-role-separate-login]|NEW[vendor-status-keep-primary-role]
BENEFIT:guardians-manage-bestie-vendor+one-login

## NOTIF_CENTER_PAGE
ROUTE:/notifications|ACCESS:auth-all-roles
LINK:NotificationBell→View-All-Notifications-btn
FEATURES:advanced-filtering[search-type-date]|bulk[mark-all-read-clear-read]|tabs[Unread-Read-All-badges]|cards[Bell-icon-title-msg-timestamp-type-badge-resolved-unread-dot-hover-delete]|empty-states
STRUCTURE:main.pt-24>Container.max-w-4xl>BackButton+Header+Filters+BulkActions+Tabs>TabsList+TabsContent[map-cards]
DATA:useNotifications[notifications+loading+methods]|filter[search-type-date]
TYPES-MAP:{all|pending_approval:Approvals|moderation_needed:Moderation|comment_on_post:Comments|new_sponsor_message:Messages|vendor_application:Vendors|product_update:Updates}
MOBILE:filters-stack-vertical|tabs-grid-adjust|search-full-width|max-w-90vw
WORKFLOWS:view-all[bell→View-All→page]|filter[search-type-date]|bulk[mark-all-clear]|individual[click→nav+mark-read|hover→del]

## EMAIL_TESTING
OVERVIEW:22-tests-across-6-files|production-parity-pattern|Resend-real-API|DB-state-verification
CATEGORIES:contact-form[5-tests-production-parity]|other[17-tests-auth-client-pattern]
PATTERN:seed-test-data→trigger-email→wait-DB-state→verify-NOT-email-capture
FILES:email-approvals.spec.ts[3]|email-digest.spec.ts[3]|email-notifications.spec.ts[4]|email-sponsorship-receipts.spec.ts[4]|email-messages.spec.ts[3]|email-contact-form-resend.spec.ts[5]
SEED:seed-email-test-data→4-users[guardian+bestie+sponsor+vendor]+relationships+JWT-tokens
HELPERS:resend-test-helper.ts[waitForSubmission|waitForReply|simulateInboundEmail|verifySubmission|verifyReply|cleanupTestSubmissions]
CI:manual-trigger[run_email_tests-input]|chromium-only|45-min-timeout|no-shard[shared-auth-clients]
PERFORMANCE:single-query-pattern[fetch-all-once+client-filter]|prevents-timeout-100+-queries→2-3-queries
CRITICAL-SCHEMA:sponsorship_receipts[sponsorship_id+organization_name+organization_ein]|notification_preferences[enable_digest_emails]|vendor_bestie_assets[vendor_bestie_request_id]
VERIFICATION:DB-state-NOT-email-capture|Resend-API-real|5s-wait-async-processing
DOC:EMAIL_TESTING_SYSTEM_COMPLETE.md|EMAIL_TESTING_PRODUCTION_PARITY.md

## MULTI_TENANT_CONVERSION
DOC:MULTI_TENANT_CONVERSION_PLAN.md
OVERVIEW:convert-single-tenant→multi-tenant-SaaS|seat-based-billing|10-12-weeks
STRATEGY:dark-launch-main-branch|feature-flags|phased-approach|zero-downtime
ARCHITECTURE:row-level-tenancy|organization_id-all-tables|RLS-data-isolation
BILLING:Stripe-subscriptions|Starter-$99|Professional-$299|Enterprise-$799|$20-per-seat
STATUS:PLANNING-PHASE|NOT-IMPLEMENTED

## TEST_PYRAMID_CONVERSION
STATUS:ACTIVE-CONVERSION-IN-PROGRESS[Week-1-COMPLETE|Week-2-COMPLETE|Week-3-NEXT]
MASTER-PLAN:docs/OPTION_1_PLUS_IMPLEMENTATION.md[SOURCE-OF-TRUTH]
TIMELINE:6-weeks[93-unit+188-integration+18-critical-E2E]
TARGET:414-E2E-tests→93-unit+188-integration+18-E2E[80%-reduction-E2E]

⚠️ MANDATORY-BEFORE-ANY-TEST-WORK ⚠️
STEP-1:READ-docs/OPTION_1_PLUS_IMPLEMENTATION.md→current-week-status-and-deliverables
STEP-2:VERIFY-which-E2E-tests-converting-this-week[specific-files-and-scenarios]
STEP-3:CHECK-archive-strategy[tests/e2e/archived/week{N}-{category}]
STEP-4:CONFIRM-target-test-counts-and-expected-outcomes
STEP-5:UPDATE-progress-tracker-after-completing-work

WEEK-BY-WEEK-BREAKDOWN:
Week-1[✅COMPLETE]:93-unit-tests→cart-calculations|donation-calculations|date-formatting|validation-rules|rarity-calculations
Week-2[✅COMPLETE]:90-integration-tests→discussions-rendering[36]|events-rendering[30]|navigation-behavior[34]|ARCHIVED-~74-E2E-scenarios
Week-3[🎯NEXT]:52-integration-tests→forms-validation|admin-tabs|notifications-UI|ARCHIVE-~52-E2E
Week-4[PLANNED]:28-integration-tests→video-player|help-center|cart-UI|vendor-dashboard|ARCHIVE-~28-E2E
Week-5[PLANNED]:18-critical-E2E→revenue|email|content-approval|auth-flows|vendor-linking|gamification|ARCHIVE-~242-E2E
Week-6[PLANNED]:Percy-visual-regression+comprehensive-docs+final-cleanup

ARCHIVING-PATTERN[CRITICAL]:
1-CREATE:integration-test-file[tests/integration/{feature}.test.tsx]
2-VERIFY:covers-all-scenarios-from-corresponding-E2E-tests
3-RUN:ensure-all-integration-tests-pass
4-ARCHIVE:move-E2E-test-to[tests/e2e/archived/week{N}-{category}/]
5-UPDATE:docs/OPTION_1_PLUS_IMPLEMENTATION.md→Progress-Tracker-section
6-COMMIT:show-visible-progress[E2E-count-drops-immediately]

TEST-TYPE-DECISION-MATRIX:
UNIT-TEST:pure-functions|calculations|utilities|validators|formatters|NO-React|NO-Supabase
INTEGRATION-TEST:React-components|UI-rendering|user-interactions|mocked-Supabase|MSW-API-responses
E2E-TEST:critical-revenue-flows|auth-complete-flows|cross-system-workflows|real-Supabase|real-browser

CRITICAL-RULES[NO-EXCEPTIONS]:
❌NEVER-create-modify-test-files-WITHOUT-checking-OPTION_1_PLUS_IMPLEMENTATION.md-FIRST
❌NEVER-skip-archiving-E2E-tests-after-creating-replacements[causes-error-pile-up]
❌NEVER-work-on-wrong-week[follow-sequential-order:Week-1→2→3→4→5→6]
✅ALWAYS-update-Progress-Tracker-in-OPTION_1_PLUS_IMPLEMENTATION.md-after-changes
✅ALWAYS-use-test-builders[tests/builders/]→GuardianBuilder|SponsorshipBuilder|DiscussionBuilder
✅ALWAYS-archive-to-correct-week-folder[tests/e2e/archived/week{N}-{category}/]
✅ALWAYS-show-visible-progress[user-sees-E2E-count-drop-as-conversion-progresses]

EXPECTED-CI-IMPACT-PER-WEEK:
Week-1:414-E2E→~405-E2E[minimal-archive|unit-extracts-logic-not-flows]
Week-2:~405-E2E→~340-E2E[MAJOR-archive|integration-replaces-entire-test-files]
Week-3:~340-E2E→~288-E2E[continued-integration-conversions]
Week-4:~288-E2E→~260-E2E[final-integration-conversions]
Week-5:~260-E2E→18-E2E[MASSIVE-archive|only-critical-paths-remain]
Week-6:18-E2E-FINAL[optimized|reliable|fast]

RELATED-DOCUMENTATION:
PRIMARY:docs/OPTION_1_PLUS_IMPLEMENTATION.md[master-plan|weekly-deliverables|progress-tracker]
STRATEGY:docs/TESTING_STRATEGY.md[pyramid-rationale|decision-matrix|best-practices]
SUMMARY:docs/OPTION_1_PLUS_SUMMARY.md[quick-overview|18-critical-E2E-list]
BUILDERS:docs/TESTING_BUILDERS.md[fluent-API|test-data-patterns]
INTEGRATION:docs/TESTING_INTEGRATION.md[MSW-setup|component-testing|mocking-guide]
ARCHIVE:tests/e2e/archived/README.md[why-archived|resurrection-process]

WHY-THIS-MATTERS:
Without-checking-these-docs-FIRST→AI-will:
- Create-tests-without-understanding-current-week-context
- Miss-archiving-step[tests-accumulate-as-"errors"]
- Work-on-wrong-week-tasks[breaks-sequential-plan]
- Not-update-progress-documentation[user-loses-visibility]
- Duplicate-effort[recreate-existing-tests]
- Break-CI[mix-archived-and-active-tests]

CURRENT-STATUS:Week-1-complete[93-unit-tests]|Week-2-complete[90-integration-tests|exceeded-target]|Week-3-ready[forms+admin+notifications]
PROGRESS:174-integration-tests-total|~340-E2E-remaining|target-18-E2E-final
DOC:docs/OPTION_1_PLUS_IMPLEMENTATION.md
