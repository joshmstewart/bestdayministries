
# Fix All CORS Issues Across Edge Functions

## The Problem

A recent Supabase client update added new tracking headers that are automatically sent with every request:
- `x-supabase-client-platform`
- `x-supabase-client-platform-version`
- `x-supabase-client-runtime`
- `x-supabase-client-runtime-version`

When these headers aren't listed in `Access-Control-Allow-Headers`, browsers block the requests (CORS preflight failure).

## Current State

| Status | Count |
|--------|-------|
| ✅ Already fixed | 11 functions |
| ❌ Need updating | **110 functions** |

## The Fix

Update every edge function's CORS headers from:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

To:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

## Implementation Plan

### Phase 1: Batch Updates (110 files)
I'll update all 110 edge functions in batches, using parallel file edits for efficiency:

**Batch 1-11** (~10 functions each): Update CORS headers in all affected files

### Phase 2: Bulk Deployment
After all files are updated, deploy all edge functions at once to make them live.

### Phase 3: Verification
Test key functions to confirm CORS errors are resolved.

---

## Functions to Update (Complete List)

1. aftership-webhook
2. award-time-trial-rewards
3. backfill-donation-emails
4. backfill-drink-descriptions
5. backfill-recipe-tools
6. backfill-sponsorship-receipts
7. broadcast-product-update
8. bulk-delete-users
9. calculate-shipping-rates
10. check-printify-status
11. check-stripe-connect-status
12. check-stripe-customer
13. claim-chore-reward
14. claim-daily-login-reward
15. claim-streak-reward
16. cleanup-duplicate-donations
17. cleanup-email-test-data
18. cleanup-test-data-unified
19. create-donation-checkout
20. create-donation-from-stripe
21. create-fortune-discussion-post
22. create-marketplace-checkout
23. create-persistent-test-accounts
24. create-printify-order
25. create-sponsorship-checkout
26. create-stripe-connect-account
27. create-stripe-login-link
28. create-system-user
29. create-user
30. create-vendor-transfer
31. debug-donation-history
32. debug-donation-reconciliation
33. delete-joke-library
34. delete-own-account
35. delete-user
36. donation-mapping-snapshot
37. elevenlabs-generate-audio-clip
38. elevenlabs-music
39. elevenlabs-scribe-token
40. elevenlabs-sfx
41. emotion-journal-response
42. extract-pdf-pages
43. fetch-printify-products
44. fix-receipt-emails
45. generate-avatar-celebration-image
46. generate-avatar-emotion-image
47. generate-avatar-image
48. generate-beat-image
49. generate-card-design
50. generate-card-template-cover
51. generate-card-template-description
52. generate-chore-celebration-image
53. generate-coloring-book-cover
54. generate-coloring-book-description
55. generate-coloring-book-ideas
56. generate-coloring-page-ideas
57. generate-coloring-page
58. generate-customer-image
59. generate-drink-description
60. generate-drink-image
61. generate-drink-name
62. generate-fortune-posts
63. generate-fortunes-batch
64. generate-full-recipe
65. generate-ingredient-icon
66. generate-joke-category-icon
67. generate-joke
68. generate-joy-house-images
69. generate-meta-tags
70. generate-missing-donation-receipts
71. generate-missing-receipts
72. generate-printify-images
73. generate-profile-avatar
74. generate-recipe-expansion-tips
75. generate-recipe-ingredient-icon
76. generate-recipe-tool-icon
77. generate-sitemap
78. generate-sticker-description
79. generate-store-details
80. generate-store-image
81. generate-user-scratch-cards
82. generate-vibe-icon
83. generate-wordle-word-scheduled
84. generate-wordle-word
85. generate-workout-image
86. generate-workout-location-image
87. generate-year-end-summary
88. get-coffee-shop-content
89. get-donation-history
90. get-google-places-key
91. get-joke
92. get-sentry-dsn
93. get-wordle-dates
94. get-wordle-state
95. github-test-webhook
96. handle-resend-webhook
97. import-printify-product
98. lookup-guest-order
99. manage-sponsorship
100. manual-complete-donation
101. moderate-content
102. moderate-image
103. moderate-video
104. notify-admin-assignment
105. notify-admin-new-contact
106. notify-admins-new-message
107. parse-recipe
108. poll-aftership-status
109. poll-shipstation-status
110. prayer-expiry-notifications
...and more

---

## Technical Details

### Why This Happened
The Supabase JavaScript client was updated and now sends additional tracking headers. These headers must be explicitly allowed in CORS configuration.

### Prevention Going Forward
- Pin the Supabase client version in all edge functions to `@2.58.0`
- Document the required CORS headers in the project's edge function template
- Update `MASTER_SYSTEM_DOCS.md` with the new CORS header standard

### Risk Assessment
- **Low risk**: Only changing HTTP header configuration
- **No data changes**: No database modifications
- **Easily reversible**: Can revert individual functions if needed

## Timeline
This is a batch operation that will take some time due to the number of files, but once approved, I'll update all 110 functions systematically.
