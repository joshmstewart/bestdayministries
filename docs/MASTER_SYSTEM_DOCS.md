MASTER_SYSTEM_DOCS

## GUARDIAN_APPROVALS|/guardian-approvals|caregiver-only
TABS:posts(discussion_posts.approval_status=pending_approval+linked_bestie→approve[approved+is_moderated=true]|reject[rejected]|del)|comments(discussion_comments.approval_status=pending_approval+linked→approve|reject)|vendors(VendorLinkRequests:vendor_bestie_requests.status=pending+linked→approve[status=approved]|reject[rejected])|messages(BestieSponsorMessages:sponsor_messages.status=pending_approval+linked→approve-as-is[status=approved]|edit-approve[subject/text/img-crop-recrop/vid-upload+from_guardian=true+save→app-assets/sponsor-messages/]|reject[reason])
FLAGS:caregiver_bestie_links(require_post_approval|require_comment_approval|require_message_approval[def:true]|require_vendor_asset_approval)
BADGE:useGuardianApprovalsCount→SUM(pending:posts+comments+vendor_links+messages)→realtime-subscriptions×4
RLS:is_guardian_of(guardian_id,bestie_id)→UPDATE(discussion_posts|discussion_comments|vendor_bestie_requests|sponsor_messages)
FILES:GuardianApprovals.tsx|VendorLinkRequests.tsx|BestieSponsorMessages.tsx|useGuardianApprovalsCount.ts
ISSUES:empty→check-links|count-no-update→verify-realtime-cleanup|cant-approve→check-is_guardian_of-func

## VIDEO_SYSTEM
COMPS:VideoPlayer(HTML5+auto-hide-controls+dynamic-aspect-from-meta+max-w-md[vert]|max-w-2xl[land]+NO-object-fit[critical:bars/crop])|YouTubeEmbed(iframe+parse-all-YT-URL+def:16:9)|YouTubeChannel(promo-section+custom-YT-logo+config[badge+heading+desc+URL]+card-gradient-bg)
DB:videos(id|title|video_url[uploads]|youtube_url[embeds]|video_type|thumbnail_url|description|category|is_active|display_order)|about_sections.youtube_channel(content.badge_text|heading|description|channel_url|button_text)|storage:videos-bucket[100MB]+RLS[public-SELECT-active+admins-ALL]
ADMIN:VideoManager→Admin-Videos→upload/embed+thumbnails+meta+toggle-vis+reorder[drag-drop]+del|YouTube-Channel→Admin-About→Edit-youtube_channel-section→config[URL+button-text+desc]
INTEGRATIONS:discussion_posts(video_id[link-table]|youtube_url[direct])|app_settings.sponsor_page_content.featured_video_id|videos-page[gallery+fullscreen-dialog]|about-page(youtube-channel-section[about_sections]+doc-watch-btns[YT/Vimeo/Dailymotion→about_sections.content.doc_*_url])
RULES:VideoPlayer:YES[dynamic-aspectRatio-inline+w-full-h-full+grad-overlays]NO[object-fit+fixed-aspect]|YouTubeEmbed:YES[flex-URL-parse+AspectRatio-wrap+iframe-security]|YouTubeChannel:YES[red-YT-logo-SVG[rounded-rect+white-triangle]+btn-new-tab]NO[Lucide-YouTube-icon]
ISSUES:black-bars/crop→rm-object-fit|wrong-size→dynamic-style|YT-logo-wrong→custom-SVG-red-bg-white-tri
FILES:VideoPlayer.tsx|YouTubeEmbed.tsx|VideoManager.tsx|YouTubeChannel.tsx|About.tsx[doc-section]

## VISIBILITY_TOGGLE_STANDARD
PURPOSE:btn-component→toggle-DB-UI-state[active/visible|inactive/hidden]
VISUAL:ACTIVE[bg-green-100+hover:bg-green-200+border-green-300+Eye-icon-text-green-700]|INACTIVE[bg-red-100+hover:bg-red-200+border-red-300+EyeOff-icon-text-red-700]
PATTERN:Button[variant=outline+size=icon+onClick=toggleFunction(id,state)+title=state?Deactivate:Activate+className=state?green-classes:red-classes]+icon=state?Eye[w-4-h-4-text-green-700]:EyeOff[w-4-h-4-text-red-700]
FILES:vendor/ProductList.tsx[product-vis]|admin/CommunityOrderManager.tsx[section-vis]|admin/FamilyOrganizationsManager.tsx[org-active]|admin/FeaturedItemManager.tsx[featured-active]|admin/FooterLinksManager.tsx[footer-sections-links]|admin/HomepageOrderManager.tsx[homepage-sections]|admin/NavigationBarManager.tsx[nav-links]|EventManagement.tsx[event-vis]
STANDARD:green=active/visible|red=inactive/hidden[consistent-across-all]

## BACK_BUTTON_PLACEMENT
SPACING:main[pt-4-with-navbar|pt-6-no-navbar]|btn[mb-6-standard|mb-4-dense]
STYLE:Button[variant=outline+size=sm]+ArrowLeft[mr-2-h-4-w-4]+"Back-to-[Destination]"[required-descriptive-text]
LAYOUT-STANDARD:main.flex-1.pt-4>container.mx-auto.px-4>Button.mb-6+Card
LAYOUT-BANNER:banner-div[h-32-bg-gradient]>container.mx-auto.px-4.h-full.flex.items-center>Button|container.mx-auto.px-4>relative-Card[-mt-8-mb-6-overlaps-banner]
MISTAKES:NO[mb-12+too-much|inconsistent-spacing|btn-inside-cards|different-variants|icon-only-missing-text]
A11Y:descriptive-text-required[not-just-icon]+min-44x44px-touch+color-contrast+semantic-button-with-onClick

## NAVIGATION_BAR
VISIBILITY:user+profile+role≠vendor→shows|hidden-for[non-auth+vendors]|visible-for[bestie+caregiver+supporter+admin+owner]
SCROLL:shows[within-150px-top|scrolling-UP]|hides[past-150px+scrolling-DOWN]|CSS[translate-y-0-opacity-100-visible|-translate-y-full-opacity-0-hidden]
PAGE-SPACING:CRITICAL-all-pages-MUST-pt-24[96px-min-clearance-80px]|standard[pt-24]|with-banner[banner-overlap-content-below-pt-24]
LINKS:navigation_links(id|label|href|display_order|is_active=true)→internal[Link-to-href]|external[a-href-target-blank-rel-noopener]
STYLE:hover-burnt-orange+animated-underline+font-Roca
DIMENSIONS:height~112px[header-64px+nav-48px]|z-50|backdrop-blur
REALTIME:subscribes-navigation_links→auto-refresh
USER-BADGE:right-side+User-icon+capitalized-role
POSITION:absolute-top-full-overlays-content[not-push-down]|full-width-left-0-right-0|z-50|backdrop-blur
VENDOR-EXCLUSION:profile.role≠vendor→prevents-display|vendors-use-/vendor-dashboard[separate-tabs:Products+Orders+Earnings+Settings]

## NOTIFICATION_BADGES
LOCATIONS:UnifiedHeader-Approvals-btn[caregivers-only:pending-posts+comments+vendor-links→useGuardianApprovalsCount→red-top-right]|UnifiedHeader-Admin-btn[admins-only:moderationCount+pendingVendorsCount→red-top-right]|Admin-Vendors-tab[pendingVendorsCount→red-next-label]|Admin-Moderation-tab[useModerationCount→red-next-label]|Guardian-Approvals-tabs[Posts:pendingPosts.length|Comments:pendingComments.length|Vendor-Links:pendingVendorLinks→all-red/destructive]
INVENTORY-BADGES:Admin-Vendor-Mgmt[red-when-inventory≤10]|Marketplace-Product-Cards[Out-of-Stock-when-inventory=0]|Vendor-Product-List[Out-of-Stock-when-inventory=0]
FEATURES:red-destructive-variant+realtime-subscriptions+auto-updates

## BESTIE_LINKING_SYSTEM
FRIEND-CODE:3-emojis[20-emoji-set=8000-combos]|storage:profiles.friend_code[TEXT-3-chars]|regen-doesnt-break-links[UUID-based]|emojis:🌟🌈🔥🌊🌸🍕🎸🚀🏆⚡🎨🎭🎪🏰🌵🦋🐉🎯🎺🏖️
GUARDIAN-BESTIE:table:caregiver_bestie_links(caregiver_id|bestie_id|relationship|approval-flags+timestamps)|flow:guardian-enters-3-emoji→search-profiles_public[friend_code+role=bestie]→creates-link-with-approval-settings[posts+comments+featured-posts]|guardian-can:view-unlink-besties+toggle-approval-reqs+manage-featured-posts-sponsorships|RLS:caregivers-CRUD-own-links+besties-view-links
VENDOR-BESTIE:table:vendor_bestie_requests(vendor_id|bestie_id|status[pending/approved/rejected]|reviewed_by|message)|flow:vendor-submits-request[3-emoji+msg]→guardian-approves-rejects[/guardian-approvals]→approved-vendors-feature-ONE-bestie[vendors.featured_bestie_id]|vendor-can:view-pending-approved-links+feature-unfeature-bestie[shows-profile+marketplace]|guardian-can:approve-reject-requests|RLS:vendors-see-requests+guardians-approve-linked-besties
SPONSOR-BESTIE:table:sponsorships(sponsor_id|bestie_id|amount|frequency|status|stripe_subscription_id)|table:sponsorship_shares[share-view-access-other-besties]|flow:supporter-sponsors[/sponsor-bestie-via-Stripe]→webhook-creates-sponsorships[status:active]→supporter-shares-access[sponsorship_shares]|supporter-can:view-manage-subs[/guardian-links]+cancel-modify[Stripe-portal]+share-view-access|RLS:sponsors-besties-view-own+shared-users-via-can_view_sponsorship()
BEHAVIORS:friend-code-change:existing-links-preserved[UUID-based]+only-affects-NEW-links[like-changing-phone-old-contacts-still-have-you]|frontend-pattern:3-Select-components-map-FRIEND_CODE_EMOJIS[emoji+name]|components:GuardianLinks.tsx|VendorBestieLinkRequest.tsx|VendorLinkRequests.tsx|VendorLinkedBesties.tsx
USE-CASES:guardian-links-child[enter-code→set-relationship→toggle-approvals]|vendor-features-bestie[request→guardian-approves→vendor-features]|supporter-sponsors[browse-/sponsor-bestie→pay→share-access]|bestie-regenerates-code[old-links-stay+new-code-future-connections]
SECURITY:is_guardian_of(_guardian_id,_bestie_id)
NOT-IMPLEMENTED:bestie-initiated-linking|link-expiration|email-notifications|rate-limiting|multi-guardian-support|vendor-unlink|friend-code-history|approval-notifications

## EVENTS_SYSTEM
TYPES:single[is_recurring:false+only-event_date]|recurring-multi[is_recurring:true+event_dates-entries→separate-card-per-date]|recurring-template[is_recurring:true+no-event_dates→shows-primary-date-only]
DISPLAY:upcoming[date≥now+chronological+each-date=card]|past[date<now+expires_after_date=false+reverse-chron+grayscale+Past-Event-badge]|expiration[expires_after_date=true→past-dates-hidden]|role-filter:client-side-filter-visible_to_roles
CARD-COMPS:image[AspectRatio-wrapper+parse-string-9:16→decimal-9/16]|dates[primary-large-box+all-dates-list-if-multi+current-highlighted]|TTS[reads-title+desc+date+location]|location[clickable-LocationLink→Google-Maps]|audio[inline-AudioPlayer-if-audio_url]
DETAIL-DIALOG:click-card→EventDetailDialog[full-details+all-dates+recurrence-info+audio+location]
LINKED-EVENTS:URL:/events?eventId=xxx[from-discussion-posts-via-event_id]→auto-opens-dialog+bypasses-expiration-for-linked
MODERATION:image:moderate-image-edge-func-on-upload→stores-moderation_status+moderation_severity+moderation_reason
ADMIN:/event-management→create-edit[title+desc+date-time+recurrence+image-crop-aspect+audio+visibility-roles+expiration-toggle]|add-multi-dates[edit-event→Add-Date→creates-event_dates-entry]
DB:events(title|description|image_url|audio_url|location|event_date|aspect_ratio[def:9:16]|is_recurring|recurrence_type|expires_after_date|visible_to_roles[]|is_active)|event_dates(event_id|event_date)|event_attendees(event_id|user_id|status[future])
RLS:SELECT[all-auth-client-filter]|INSERT[auth-users]|UPDATE-DELETE[author-or-admin]|event_dates[creator-only]
ISSUES:not-showing→check-is_active+visible_to_roles+user-role|wrong-aspect→parse-string-to-decimal|past-visible→check-expires_after_date|recurring-shows-once→add-event_dates
FILES:EventsPage.tsx|EventManagement.tsx|EventDetailDialog.tsx|moderate-image/index.ts

## SPONSORSHIP_SYSTEM
GUEST-CHECKOUT:no-account-required→stored-with-sponsor_email[no-sponsor_id]|trigger:link_guest_sponsorships()-on-signup→auto-links-when-email-matches|RLS:logged-users-view-by-email-match|msg:"sponsorship-auto-link-when-create-account-with-email"
FUNDING-PROGRESS:only-if-monthly_goal>0|calc:SUM-active-monthly-sponsorships|fully-funded:is_fully_funded-OR-funding_percentage≥100
MESSAGE-APPROVAL:controlled-per-link:require_message_approval|guardian-edit-before-approve[add-images+modify-text]|status:pending_approval→approved→sent[auto-on-sponsor-view]|besties-see:Approved-Delivered-after-guardian-approval
SPONSOR-BESTIE-VS-ACTUAL:sponsor_besties.id→listing-ID[used-in-sponsorships]|sponsor_besties.bestie_id→optional-link-to-user|allows:generic-sponsorships-without-user-accounts
IMAGE-HANDLING:upload-to-app-assets|guardian-crop-with-aspect-ratio|display-supports-audio+image-together
DB:sponsor_besties(id|bestie_id[nullable-link-user]|bestie_name|image_url|voice_note_url|video_url|text_sections[jsonb:[{header,text}]]|aspect_ratio[def:9:16]|monthly_goal|is_active|is_fully_funded|available_for_sponsorship|start_date|end_date)|sponsorships(id|sponsor_id|bestie_id|sponsor_bestie_id|amount|frequency[one-time/monthly]|status[active/cancelled/paused]|stripe_subscription_id|stripe_customer_id|stripe_mode[test/live]|sponsor_email[nullable-guest]|receipt_sent|receipt_sent_at|receipt_number|started_at|ended_at)|sponsor_messages(id|bestie_id|sent_by|subject|message|audio_url|image_url|video_url|status[pending_approval/approved/sent/rejected]|from_guardian|is_read|rejection_reason|approved_by|approved_at|sent_at|moderation_status|moderation_reason)|caregiver_bestie_links(allow_sponsor_messages|require_message_approval[both-def:true]|show_sponsor_link_on_guardian|show_sponsor_link_on_bestie)|sponsor_page_sections(section_key[unique:header/featured_video/sponsor_carousel/selection_form/impact_info]|section_name|is_visible|display_order|content[jsonb])|receipt_settings(organization_name|organization_address|tax_id[EIN]|from_email|reply_to_email|website_url|receipt_footer_text)|year_end_summary_settings(email_subject|email_intro_text|tax_notice_text|is_enabled)|year_end_summary_sent(user_id|user_email|user_name|tax_year|total_amount|sent_at|resend_email_id|status)
VIEWS:sponsor_bestie_funding_progress[sponsor_bestie_id|bestie_name|current_monthly_pledges|monthly_goal|funding_percentage|remaining_needed]|sponsorship_year_end_summary[sponsor_email|sponsor_name|tax_year|total_amount|total_donations|donations[jsonb-array]]
EDGE-FUNCS:create-sponsorship-checkout[no-auth→supports-guest|get-create-stripe-customer-by-email|create-price|checkout-session[subscription-monthly|payment-one-time]|store-bestie_id-metadata→return-url]|verify-sponsorship-payment[session_id→verify-stripe|get-email-from-session|find-user-by-email|check-existing-by-stripe_subscription_id|insert-sponsorships[if-user:sponsor_id=user.id+sponsor_email=NULL|if-guest:sponsor_id=NULL+sponsor_email=email]→return-msg[guest:"auto-link-when-create-account"]]|manage-sponsorship[auth-token→get-stripe-customer-by-email|create-billing-portal→return-url-redirect-stripe-portal→webhooks-handle-status-updates]|update-sponsorship[sponsorship_id+new_amount→auth+verify-owns-sponsorship[active-monthly-only]|validate-amount[$10-$500]|find-stripe-sub-by-email+bestie_id|update-stripe-price|update-DB-amount→return-success]|send-sponsorship-receipt[sponsorship_id→fetch-details+settings|get-org-logo-app-settings|gen-receipt-HTML[number:RCPT-YYYYMMDD-XXXXX+sponsor+org+amount+date+bestie+EIN+disclaimer]|send-Resend-API|update-sponsorships[receipt_sent=true+receipt_sent_at+receipt_number]→return]|generate-missing-receipts[admin-only→query-receipt_sent=false|loop-call-send-sponsorship-receipt|log-each→return-summary[total+successes+failures]]|generate-year-end-summary[taxYear?+sendEmail?→auth|query-view-email+year|if-no-data+!sendEmail:gen-mock|fetch-settings+logo|build-HTML[header-logo-year+total-box+itemized-table[date+bestie+amount+receipt#]+tax-box[EIN+notice]+footer]|if-sendEmail:send-Resend+log-year_end_summary_sent→return-HTML+metadata[isMockData-flag]]
WEBHOOKS:stripe-webhook[ACTIVE-dual-test+live]|events:customer.subscription.deleted[active→cancelled+set-ended_at]|customer.subscription.updated[3-states:cancel_at_period_end=true→stay-active-set-ended_at-to-cancel_at|status=active→active-clear-ended_at|other→cancelled-set-ended_at-now]→checks-metadata-bestie_id|checkout.session.completed[create-update-sponsorship|extract-amount-cents→dollars|set-frequency-by-interval|status:active+started_at:now|store-stripe_mode]
STATUS-FLOW-PROGRESS:statuses[active-counts-funding|cancelled-excluded|paused-future]|view-recalc:SUM(amount)-WHERE-status=active+frequency=monthly|progress:(current/goal)*100|fully-funded:percentage≥100-OR-is_fully_funded=true|ending-amount-scheduled-cancels:sponsorships-with-ended_at-set-still-in-period→progress-bar-2-segments[stable-green+ending-yellow]|UI-update:user-cancels-portal→webhook-updates-status→view-recalcs-excludes-cancelled→frontend-queries→bar-updates-auto
REALTIME:useGuardianApprovalsCount[subscribes:discussion_posts+discussion_comments+sponsor_messages+caregiver_bestie_links→updates-badge-immediately]|useSponsorUnreadCount[subscribes:sponsor_messages+sponsorships→updates-when-read-sent]|SponsorMessageInbox[subscribes:sponsor_messages-filtered-bestie_id→updates-new-status-changes]
COMPS-DISPLAY:SponsorBestieDisplay.tsx[carousel+TTS+audio+funding-progress]|FundingProgressBar.tsx[visual-indicator]
COMPS-FORM:BestieSponsorMessenger.tsx[bestie-composition]|GuardianSponsorMessenger.tsx[guardian-future]
COMPS-GUARDIAN:BestieSponsorMessages.tsx[approval-interface+edit-dialog]|VendorAssetRequests.tsx[asset-approval-pattern]
COMPS-SPONSOR:SponsorMessageInbox.tsx[accordion-list+read-status]|DonationHistory.tsx[table+receipt-downloads]
COMPS-ADMIN:SponsorBestieManager.tsx[CRUD-listings]|SponsorPageOrderManager.tsx[section-ordering]|SponsorBestiePageManager.tsx[header-editor]|SponsorshipTransactionsManager.tsx[transaction-view-mgmt]|ReceiptSettingsManager.tsx[org-receipt-config]|YearEndSummarySettings.tsx[year-end-email-config]|YearEndSummarySentHistory.tsx[sent-history]|StripeModeSwitcher.tsx[test-live-toggle]
PAGES:/sponsor-bestie[public-page]|/sponsorship-success[post-payment]|/guardian-links[my-besties-sponsors+guardians]|/bestie-messages[bestie-center]|/guardian-approvals[guardian-hub]
TRIGGERS:link_guest_sponsorships()[ON-INSERT-auth.users-after-signup→get-email→find-sponsorships[sponsor_email-match+sponsor_id-NULL]→update[set-sponsor_id=new-user+clear-sponsor_email]]|SECURITY-DEFINER-search_path=public
SECURITY-FUNCS:has_admin_access(_user_id)|is_guardian_of(_guardian_id,_bestie_id)|get_user_role(_user_id)|can_view_sponsorship(_sponsorship_id,_user_id)
STORAGE:app-assets-public[sponsor-besties/{id}/|sponsor-messages/{id}/+images-videos|logos/]|featured-bestie-audio-public[voice-notes|audio-recordings]
ISSUES:badge-no-update→check-realtime-cleanup|msg-no-img→display-logic-prioritizes-audio[FIXED:show-both]|aspect-btns-dont-work→missing-onAspectRatioKeyChange|bestie-cant-send→allow_sponsor_messages=false|funding-not-calc→no-monthly_goal|stripe-checkout-fails→check-STRIPE_SECRET_KEY_TEST-LIVE|progress-no-update-after-cancel→webhook-not-processing|cancelled-still-counts→status-not-updated|portal-btn-no-work→no-stripe-customer|receipt-not-sending→from-email-not-verified-Resend|receipt-sends-not-received→SPF-DKIM-DNS|receipt-#-dupes→system-clock-issue[uses-timestamp+random]|year-end-no-data→no-completed-donations-for-year|preview-fails→receipt-settings-not-configured|mock-in-preview→no-real-donations[expected]|email-logo-missing→logo-URL-not-in-app-settings|EIN-validation-fails→wrong-format[use-XX-XXXXXXX]|transactions-wrong-mode→mode-not-stored-creation[check-stripe_mode]|test-payments-not-visible→viewing-live-only[toggle-switcher]|guest-not-linking→email-mismatch-or-trigger-failure|cant-view-after-signup→email-mismatch|cant-update-amount→not-monthly-or-not-active|update-amount-fails→out-of-range[$10-$500]|shared-not-visible→friend-code-mismatch
NOT-IMPLEMENTED:guardian-initiated-msgs|sponsor-replies-2-way|analytics-dashboard[donation-trends-retention]|bulk-msg-all-sponsors|scheduled-msgs|msg-templates|sponsor-tiers-benefits|impact-reporting-monthly|auto-thank-emails|donor-recognition-levels[Bronze-Silver-Gold]|monthly-leaderboard-opt-in|sponsor-portal-self-service|multi-bestie-packages|recurring-reminders|gift-sponsorships

## VENDOR_BESTIE_SYSTEM
OVERVIEW:vendors-display-guardian-approved-featured-bestie-content[images+videos+voice-notes]-on-vendor-profile-with-guardian-approval-workflow|NOTE:vendor=status[vendors-table]+not-role[users-can-be-caregivers-besties-supporters-AND-vendors-simultaneously]
DB:featured_besties|vendor_bestie_requests|vendor_bestie_assets|caregiver_bestie_links
WORKFLOW:1-guardian-creates-approved-featured-bestie-post→community-page|2-vendor-enters-3-emoji-code→creates-vendor_bestie_requests[pending]|3-guardian-approves-link-at-/guardian-approvals→vendor-can-request-assets|4-vendor-selects-asset→creates-vendor_bestie_assets[pending]|5-guardian-approves-asset→displays-vendor-store[/vendors/{id}]
DISPLAY:VendorBestieAssetDisplay.tsx→layout:2-col-grid[md:grid-cols-2]+max-w-6xl-mx-auto|left:asset-AspectRatio-wrapper|right:bestie-name+description+TTS|badge:Bestie-of-Month[absolute-top-4-left-4]
DATA-FETCH:1-fetch-approved-assets-vendor_bestie_assets-by-vendor_id|2-enrich-profiles_public[display_name]+featured_besties[description+aspect_ratio]|3-cross-ref-asset_url-with-image_url-voice_note_url-for-metadata
RLS:SELECT[vendors-own|guardians-linked-besties|public-approved-on-store]|INSERT[approved-vendors-only]|UPDATE[guardians-approve-reject|admins-full]
ISSUES:images-enormous→add-max-w-6xl-mx-auto|missing-name-desc→enrich-featured_besties|wrong-aspect→parse-string-9:16-to-decimal-9/16
FILES:VendorBestieAssetDisplay.tsx|VendorBestieLinkRequest.tsx|VendorLinkedBesties.tsx|VendorProfile.tsx|VendorLinkRequests.tsx|VendorAssetRequests.tsx
