# MASTER SYSTEM DOCUMENTATION

## ⚠️ CRITICAL: DOCUMENTATION WORKFLOW - READ FIRST ⚠️

**BEFORE MAKING ANY CODE CHANGES:**
1. SEARCH for relevant documentation files (MASTER_SYSTEM_DOCS.md + specific system docs)
2. READ the complete documentation for the system you're modifying
3. UNDERSTAND established patterns, database schemas, RLS policies, and component structures
4. FOLLOW the existing patterns - DO NOT reinvent or contradict documented approaches

**AFTER MAKING CODE CHANGES:**
1. UPDATE this MASTER_SYSTEM_DOCS.md file with any new/changed patterns
2. UPDATE the specific system documentation file (e.g., *_CONCISE.md, *_SYSTEM.md)
3. ADD new sections if you created new systems/features
4. CROSS-REFERENCE related systems when adding integrations

**CONSEQUENCES OF IGNORING:**
- RLS policy bugs (like the user_roles SELECT issue we just fixed)
- Inconsistent patterns across codebase
- Breaking existing functionality
- Time wasted debugging preventable issues

**THIS IS NOT OPTIONAL. DOCUMENTATION = SOURCE OF TRUTH.**

---

## NEWSLETTER|/admin→Newsletter|admin
DOC:NEWSLETTER_SYSTEM.md
DB:newsletter_campaigns|newsletter_subscribers|campaign_templates|automated_campaign_sends|newsletter_analytics|newsletter_links|newsletter_emails_log[comprehensive-audit-trail]|app_settings[newsletter_header+newsletter_footer+newsletter_organization]
EDGE:send-newsletter[admin-batch-header-footer-logging]|send-test-newsletter[admin-test-banner-logging]|send-automated-campaign[triggered-header-footer-dual-logging]|send-test-automated-template[admin-test-logging]|resend-webhook[analytics-engagement]|track-newsletter-click[redirect]|unsubscribe-newsletter[HTML-response]
COMPS:NewsletterManager[8-tabs]|NewsletterSettings|NewsletterOrganizationSettings|NewsletterHeaderFooterSettings|RichTextEditor[TipTap-images-YouTube]|NewsletterCampaigns|CampaignActions|CampaignTemplates|CampaignTemplateDialog|AutomatedSendsLog|NewsletterEmailsLog[search-filter-view-HTML]|NewsletterSubscribers|NewsletterAnalytics|NewsletterPreferences[user-profile]
FEATURES:manual-campaigns|automated-templates[6-triggers]|rich-editor|header-footer-injection[ALL-emails]|test-sending[TEST-prefix]|link-tracking|email-logging[newsletter_emails_log]|subscriber-management|analytics-dashboard|unsubscribe-system|organization-settings|batch-sending[100-per-batch]|webhook-integration[Resend]
AUTOMATED-TRIGGERS:newsletter_subscribed|newsletter_signup|site_signup|subscription_created|event_published|product_published
TRIGGER-LOCATIONS:NewsletterPreferences→newsletter_subscribed|Auth+VendorAuth→newsletter_signup+site_signup|SponsorBestie→subscription_created|EventManagement→event_published|ProductForm→product_published
PLACEHOLDERS:[EVENT_NAME]|[EVENT_DATE]|[EVENT_LOCATION]|[PRODUCT_NAME]|[PRODUCT_DESCRIPTION]|[NAME]→replaced-via-trigger_data-case-insensitive
HEADER-FOOTER:app_settings[newsletter_header:JSONB{enabled+html}|newsletter_footer:JSONB{enabled+html}]→injected-ALL-emails[manual+automated+test]
ORG-SETTINGS:app_settings[newsletter_organization:JSONB{name+address+from_email+from_name}]→used-all-sends
LOGGING:newsletter_emails_log[campaign_id+template_id+recipient_email+subject+html_content+status+error_message+resend_email_id+metadata]→every-email-logged→search-filter-view-in-admin
DUAL-LOGGING-AUTOMATED:automated_campaign_sends[status-tracking-engagement]|newsletter_emails_log[audit-trail-HTML-content]
TEST-EMAILS:[TEST]-prefix-in-subject|test-warning-banner|logged-with-metadata:{is_test:true}|sent-to-admin-only
TARGETING:all-subscribers|all-site-members|non-subscribers|role-based[filter-by-user-roles]
AUTOMATED-WORKFLOW:app-event→supabase.functions.invoke→find-active-template→fetch-header-footer-org→replace-placeholders→inject-header-footer→send-Resend→dual-log[automated_campaign_sends+newsletter_emails_log]
USER-PREFERENCES:/profile-settings→Newsletter-tab→subscribe/unsubscribe→triggers-automated-welcome-email
COMPATIBILITY:inline-styles-email-client-safe|absolute-URLs|table-layouts|no-modern-CSS
RLS:admins-only[campaigns+subscribers+templates+sends+analytics+logs]|anyone[subscriber-INSERT-public-forms]|system[edge-functions-INSERT-logs]
WEBHOOK:resend-webhook→email.sent|email.delivered|email.opened|email.clicked|email.bounced|email.complained→updates-analytics+subscriber-status+automated-sends-engagement
CRITICAL-IMPLEMENTATION:ALL-send-functions-MUST[inject-header-footer|log-newsletter_emails_log|use-org-settings|handle-errors-gracefully]

## NEWSLETTER SYSTEM

**OVERVIEW:** Complete email newsletter system with campaign management, subscriber lists, automated triggered campaigns, automatic header/footer injection, rich content editing, Resend integration for sending, test emails, working unsubscribe functionality, and user self-service subscription management.

**ROUTE:** /admin → Settings → Newsletter | /profile-settings → Newsletter (user preferences)

**DB:** newsletter_campaigns|newsletter_subscribers|campaign_templates|automated_campaign_sends|newsletter_analytics|newsletter_links|app_settings[newsletter_header|newsletter_footer]

**COMPS:** NewsletterSettings.tsx|NewsletterHeaderFooterSettings.tsx|RichTextEditor.tsx|NewsletterPreviewDialog.tsx|CampaignActions.tsx|CampaignTemplates.tsx|CampaignTemplateDialog.tsx|AutomatedSendsLog.tsx|NewsletterPreferences.tsx

**EDGE:** send-newsletter[admin-batch-tracking-100-per-batch]|send-automated-campaign[public-triggered-placeholder-replacement]|send-test-newsletter[admin-test-banner]|unsubscribe-newsletter[public-HTML-response]|track-newsletter-click[public-redirect]|resend-webhook[analytics]

**FEATURES:**
- Campaign CRUD with rich text editor (images, videos, links, formatting)
- Automated triggered campaigns (6 trigger events)
- Campaign template management with placeholder support
- Header/footer injection with logo insertion
- Image crop/resize in editor
- Test email sending before launch
- Working unsubscribe links (CAN-SPAM compliant)
- Link click tracking
- Subscriber management (import/export TODO)
- Email analytics (sent, opened, clicked)
- Target audience: all subscribers, all site members, non-subscribers only, or by specific roles
- Batch sending (100 emails per batch with delays)
- User self-service subscription with automated welcome emails

**AUTOMATED-TRIGGERS:**
1. newsletter_subscribed - Profile settings subscribe/resubscribe
2. newsletter_signup - Signup flow newsletter opt-in
3. site_signup - Account creation
4. subscription_created - Sponsorship checkout
5. event_published - Admin creates public event
6. product_published - Vendor creates active product

**CRITICAL-PATTERNS:**
- All styles MUST be inline for email clients
- Images stored in app-assets bucket (public URLs)
- Logo URLs parsed from JSON in app_settings
- Unsubscribe link includes subscriber ID
- Test emails have warning banner
- Tracking links replace original URLs
- Resubscribing triggers welcome email (always sends)
- Placeholders replaced: [EVENT_NAME], [PRODUCT_NAME], etc.

**STATUS:** ✅ Functional unsubscribe|✅ Test emails|✅ Click tracking|✅ Automated campaigns|✅ User preferences|⏳ Open tracking TODO|⏳ Campaign scheduling UI TODO

**DOC:** NEWSLETTER_SYSTEM.md

## NEWSLETTER (CONDENSED)
ADMIN-ROUTE:/admin→Newsletter[8-tabs:Campaigns|Automated|Templates|Email-Log|Sponsorship-Receipts|Subscribers|Analytics|Settings]
DB:newsletter_campaigns|newsletter_subscribers|campaign_templates|automated_campaign_sends|newsletter_analytics|newsletter_links|newsletter_emails_log|app_settings[newsletter_header|newsletter_footer|newsletter_organization]
EDGE:send-newsletter|send-test-newsletter|send-automated-campaign|send-test-automated-template|resend-webhook|track-newsletter-click|unsubscribe-newsletter
ADMIN:NewsletterManager→8-tabs-with-comprehensive-management
MANUAL-CAMPAIGNS:create-with-RichTextEditor→test-send[TEST-prefix]→send-to-subscribers→batch-100→track-opens-clicks→comprehensive-logging
AUTOMATED:6-triggers[newsletter_subscribed|newsletter_signup|site_signup|subscription_created|event_published|product_published]→placeholder-replacement→header-footer-injection→dual-logging
TARGETING:all-subscribers|all-site-members|non-subscribers|role-based-filtering
HEADER-FOOTER:enabled-toggle+HTML-content→auto-injected-ALL-emails[manual+automated+test]
EMAIL-LOG:newsletter_emails_log→every-send-logged→search-filter-view-HTML-content→debug-tool
CRITICAL:ALL-send-functions[inject-header-footer|log-to-newsletter_emails_log|use-org-settings|handle-errors]
COMPATIBILITY:inline-styles|table-layouts|email-client-safe|absolute-URLs
DOC:NEWSLETTER_SYSTEM.md

## AUDIO_RECORDING_STANDARD
ICON:Mic[w-5-h-5+text-red-500+strokeWidth-2.5+mr-2]
PURPOSE:accessibility→non-readers-identify-by-red-mic
LOCATIONS:DiscussionDetailDialog|FeaturedBestieManager|SponsorBestieManager|BestieSponsorMessenger|GuardianSponsorMessenger|AlbumManagement|EventManagement|AudioRecorder
PATTERN:Button[variant=outline]+red-Mic+text
RATIONALE:red=record-association|larger-size=visibility|bold-strokes=clarity|consistency=familiarity
DOC:AUDIO_RECORDING_STANDARD.md

## VISIBILITY_TOGGLE
PATTERN:Button[variant=outline+size=icon]|ACTIVE[green-Eye]|INACTIVE[red-EyeOff]
FILES:17-locations-use-pattern

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

## NOTIF_BADGES
LOCATIONS:UnifiedHeader[Approvals-red|Admin-red]|Admin-tabs|Guardian-tabs
FEATURES:red-destructive+realtime+auto-update

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
GUEST:no-account→sponsor_email→auto-link-on-signup
FUNDING:monthly_goal>0→SUM-active-monthly→progress
MSG-APPROVAL:require_message_approval→guardian-edit→approve
DB:sponsor_besties|sponsorships|sponsor_messages|receipt_settings|year_end_summary_settings
VIEWS:sponsor_bestie_funding_progress|sponsorship_year_end_summary
EDGE:create-checkout|verify-payment|manage|update|send-receipt|gen-receipts|year-end
WEBHOOKS:subscription.deleted→cancelled|subscription.updated→3-states|checkout.completed
REALTIME:useGuardianApprovalsCount|useSponsorUnreadCount
PAGES:/sponsor-bestie|/sponsorship-success|/guardian-links|/bestie-messages|/guardian-approvals
TRIGGERS:link_guest_sponsorships()
STORAGE:app-assets|featured-bestie-audio

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
TABS:Analytics|Users|Events|Albums|Videos|Besties[subs:Featured+Sponsors+Page+Content+Receipts+Trans+YE-Settings+History]|Partners|Donations|Featured|Vendors[badge-subs:Vendors+Products+Orders]|Format[subs:Homepage+Community+About+Footer+Quick+Nav+Locations]|Moderation[badge-subs:Content+Messages+Policies]|Contact[badge]|Help[subs:Tours+Guides+FAQs]|Updates|Notifications|Settings[subs:App+Stripe-Mode+Social-Sharing+Static-Meta+Avatars+TTS+Coins+Store+Pet-Types+Locations+Impersonation+Newsletter[subs:Campaigns+Templates+Subscribers+Automated-Sends+Header-Footer]]
STRIPE-MODE:Settings→Stripe-Mode-tab→StripeModeSwitcher[test|live-toggle]|MOVED-from[/guardian-links+/sponsor-bestie]
NEWSLETTER:Settings→Newsletter[subs:Campaigns|Templates|Subscribers|Automated-Sends|Header-Footer]→campaign-CRUD|template-management|subscriber-list|automated-sends-log|header-footer-config
CONTENT-MODERATION:Posts-tab[posts-only]|Comments-tab[comments-only]|cascade-delete-warnings[posts→comments]
DOC:CONTENT_MODERATION_CASCADE_DELETES.md

## AUTH
ROUTE:/auth
SIGNUP:email-pwd-name-role+avatar→signUp→handle_new_user()→record-terms→redirect
LOGIN:signInWithPassword→check-vendor→redirect
ROLES:supporter|bestie|caregiver|moderator|admin|owner
AVATAR:1-12→composite-{n}.png
TERMS:Guard+Dialog→versions-in-useTermsCheck
SECURITY:handle_new_user()[DEFINER]|has_role()[DEFINER]
RLS:profiles[own+guardians-linked+admins-all]|user_roles[SELECT-auth|INSERT-UPDATE-DELETE-admins]

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

## CONTACT_FORM
DB:contact_form_settings|contact_form_submissions|contact_form_replies
FRONTEND:ContactForm[auto-load-settings+validate-Zod+save-DB+email-optional-graceful]|ContactFormManager[admin-settings+submissions+badge-realtime]
VALIDATION:client-Zod|server-edge
EDGE:notify-admin|send-reply|process-inbound-email
NOTIFICATIONS:contact_form_submission[new-submissions]|contact_form_reply[user-replies]
BADGE:useContactFormCount→new-submissions+unread-replies→realtime
UI-INDICATORS:red-dot[new-OR-unread-replies]|reply-button-badge[unread-count]|clear-on-open-dialog
CLOUDFLARE:email-routing→worker→process-inbound-email→auto-thread+notify
REPLY:auto[CloudFlare-routing]|manual[admin-interface]
SETUP:Resend[verify-domain-SPF-DKIM]+CloudFlare[email-routing+worker+webhook-secret]
DOC:CONTACT_FORM_SYSTEM.md|CONTACT_FORM_NOTIFICATIONS.md|CLOUDFLARE_EMAIL_ROUTING_SETUP.md

## DISCUSSION
ROUTE:/discussions
DB:discussion_posts[created_at+updated_at]|discussion_comments[created_at+updated_at]
PERMS:posts[guardians-admins-owners]|comment[all-auth]|edit-post[author-guardian-admin]|edit-comment[author-only]|change-author[owners]
APPROVAL:bestie→check-require_post_approval→pending→guardian-approve
MODERATION:text[moderate-content]|image[moderate-image-policy]
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
DB:donations
WORKFLOW:select-frequency+amount→email→terms→Stripe→success
GUEST:donor_email→link-on-signup
EDGE:create-checkout|stripe-webhook
STATUS:One-Time[pending→completed]|Monthly[pending→active→cancelled]
FEE-COVERAGE:(amt+0.30)/0.971
DIFFERENCES:vs-sponsorships[purpose|recipient|metadata|table|UI|receipts|year-end]

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
EDGE:record-acceptance[auth+IP+user-agent]
WORKFLOWS:First[signup→dialog→accept→reload]|Update[version-change→dialog]|Guest[sponsor→signup→dialog]
SECURITY:audit-trail-IP-timestamp|non-dismissible|unique-constraint|edge-adds-metadata

## SPONSOR_PAGE
ROUTE:/sponsor-bestie?bestieId=xxx
FEATURES:dynamic-ordering|URL-param|role-block-besties|Stripe
SECTIONS:header|featured_video|carousel|selection_form|impact_info[ordered-by-display_order]
DISPLAY:SponsorBestieDisplay[carousel-7s+TTS+audio+funding+controls-inside-card]
DB:sponsor_besties|sponsor_page_sections|sponsor_bestie_funding_progress-VIEW
ADMIN:Manager[CRUD]|PageOrder[drag-drop-dnd-kit]|PageContent[edit-header]
RULES:URL[?bestieId→move-top]|role[besties-cant-sponsor]|funding[if-goal>0]|carousel[pause-on-nav-TTS]
STRIPE:create-checkout→session→URL
WORKFLOW:guardian-creates→vendor-links→guardian-approves→vendor-requests-asset→guardian-approves→displays
DISPLAY:2-col-grid[asset|bestie-name-desc-TTS]

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

## AUTOMATED_TESTING
OVERVIEW:Playwright-E2E-tests→GitHub-Actions→webhook→test_runs-table→admin-Testing-tab
TEST-ACCOUNT:test@example.com|testpassword123|REQUIRED-for-auth-pages
DB:test_runs[status|workflow|commit|branch|duration|url|test_count|passed|failed|skipped|error|metadata]
EDGE:github-test-webhook[receive-GH→parse→insert-db]
FRONTEND:TestRunsManager[list-realtime-status-badges-links-to-GH]
WORKFLOW:1)push-code→2)GH-Actions-run→3)webhook-log→4)admin-view
SETUP:GH-secrets[VITE_SUPABASE_URL+VITE_SUPABASE_PUBLISHABLE_KEY+PERCY_TOKEN]
TESTS:playwright.config.ts|17-E2E-files[basic|auth|navigation|community|forms|guardian-approvals|guardian-linking|sponsorship|store|vendor-linking|discussions|events-interactions|shopping-cart|notifications|video|help-center|performance]|3-browsers[Chrome-Firefox-Safari]
VISUAL:Percy-24-snapshots[desktop-9|mobile-6|tablet-5]|@percy/cli|npx-@percy/cli-exec|PERCY_TOKEN-secret|viewport-simulation[FREE-vs-paid-mobile-browsers]|auto-login[community-events-store-discussions]|public-pages[homepage-auth-support-help-NO-login]
PERFORMANCE:@slow-tag|load-times[<5s-pages|<6s-images]|core-web-vitals[LCP<4s|CLS<0.25]|resource-checks
STATUSES:success✅|failure❌|pending⏱|cancelled🚫
RUN-LOCAL:npx-playwright-test|--ui[interactive]|show-report[view-results]|--grep-@slow[performance]|--grep-@fast[default]
E2E-COVERAGE:
TESTS:basic|auth|navigation|community|forms|guardian-approvals|guardian-linking|sponsorship|store|vendor-linking|discussions|events-interactions|shopping-cart|notifications|video|help-center|performance
TAGS:@fast[default-60s-timeout]|@slow[performance-tests]
E2E-RELIABILITY-PATTERNS:
LAYERED-WAITS:tab-click→section-heading-wait-15s→component-title-wait-10s→button-wait-5s
SELECTORS:verify-component-code→exact-text-NOT-generic-patterns
TAB-CONTENT:ALWAYS-wait-for-specific-content-within-tab-NEVER-waitForTimeout
CRITICAL:waitForSelector[specific-targets]+exact-component-text+layered-waits=stable-tests

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
FRONTEND:Bell[badge-popover]|List[scrollable-400px-grouping]
HOOKS:useNotifications[notifications+grouped+unread+methods+realtime+cleanup]
GROUPED:rules[by-type+target]|UI[single-or-count-badge+expand]
RATE:1/endpoint/user/hr|window-60min|cleanup->1hr
EXPIRY:30d-TTL|cleanup-daily-cron
DIGEST:daily-weekly|50-unread|grouped-by-type|cron[8AM-daily|8AM-Mon-weekly]
TYPES:11-types[pending|approval|sponsor-msg|msg-status|sponsorship|sponsorship-update|event|event-update|comment-post|comment-thread|product-update]

## VENDOR_SYSTEM
CHANGE-2025-10-08:vendor=STATUS-not-role
BENEFIT:guardians-manage-bestie+one-account-multiple-capabilities
DB:vendors[status-pending-approved-rejected-suspended]|products
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

## MULTI_TENANT_CONVERSION
DOC:MULTI_TENANT_CONVERSION_PLAN.md
OVERVIEW:convert-single-tenant→multi-tenant-SaaS|seat-based-billing|10-12-weeks
STRATEGY:dark-launch-main-branch|feature-flags|phased-approach|zero-downtime
ARCHITECTURE:row-level-tenancy|organization_id-all-tables|RLS-data-isolation
BILLING:Stripe-subscriptions|Starter-$99|Professional-$299|Enterprise-$799|$20-per-seat
STATUS:PLANNING-PHASE|NOT-IMPLEMENTED
