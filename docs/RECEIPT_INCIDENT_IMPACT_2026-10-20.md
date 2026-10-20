# Receipt-email incident impact — 2026-10-20

## Scope and evidence

Investigation used only read-only SELECT queries through the database tool. No endpoints, URLs, deployments, migrations, database writes, Stripe requests, or Resend requests were made. This report is the only file written.

The incident population is `public.email_audit_log.sent_at >= '2026-10-20 02:54:00+00' AND sent_at < '2026-10-20 02:59:30+00'`. This reproduces the previously reported **228 audit rows and 105 distinct recipients**. Filtering `created_at` instead produces 229 rows and 106 recipients; these are different populations. All results below use `sent_at` unless explicitly stated otherwise. Recipient comparisons normalize case and surrounding whitespace within SQL; no recipient values are reported.

**Audit rows are not all proven deliveries:** 214 rows have status `delivered`; 14 have status `sent`. There are 225 distinct non-null provider email IDs across 104 recipients. Three `sent` rows for one recipient have no provider ID, so successful sending/delivery for those three rows cannot be established from this table alone.

## Answers

| Question | Aggregate finding |
| --- | --- |
| 1. Recipient multiplicity | Exactly 1 audit email: **45 recipients**; exactly 2: **1**; exactly 3: **57**; 4+: **2** (one with 4, one with 6). Total: **105**. |
| 2. First-time versus historical duplicates | **18 email rows / 16 donation rows / 16 recipients** had no earlier email of any type to that recipient. **208 email rows / 90 donation rows / 88 recipients** had an earlier receipt email for the same donation/receipt. **2 email rows / 2 donation rows / 2 recipients** had an earlier email of another kind but no earlier matching receipt. These categories sum to 228. |
| 3. Same donation emailed repeatedly tonight | **60 donations have 3 audit email rows each**: 180 rows. The other **48 donations have 1 row each**. Distinct provider IDs establish multiple recorded sends for **59 donations**, totaling **177 IDs**, including **118 beyond the first per donation**. The remaining repeated donation has three audit rows without provider IDs. |
| 4. Gift dates and mode | Gift-month breakdown below. **108 distinct donation rows**, all **live**; **228 live email rows**, **0 test**, **0 unknown donation mode**. |
| 5. Recurring versus one-time | Monthly: **38 audit email rows**, **14 donation rows**, **13 recipients**, **35 provider IDs**. One-time: **190 email rows**, **94 donation rows**, **92 recipients**, **190 provider IDs**. |
| 6. Clearly internal/test recipients | **1 of 105** under the explicit address-pattern rules below: **0 staff-domain matches**, **1 obvious-test match**. That recipient accounts for three audit rows without provider IDs. |
| 7. Emails for test-mode donations | **No: 0 audit email rows linked to test-mode donations**. The test-looking recipient's donation is recorded as live, not test. |

Recipient counts in the historical categories overlap: one recipient can have more than one donation in different categories. They must not be summed as unique people.

### Gift dates: donations.created_at, grouped in UTC

| Gift year-month | Distinct donation rows | Audit email rows |
| --- | ---: | ---: |
| 2025-10 | 2 | 6 |
| 2025-11 | 19 | 57 |
| 2025-12 | 25 | 75 |
| 2026-01 | 11 | 33 |
| 2026-02 | 3 | 9 |
| 2026-06 | 42 | 42 |
| 2026-07 | 3 | 3 |
| 2026-08 | 1 | 1 |
| 2026-09 | 1 | 1 |
| 2026-10 | 1 | 1 |
| **Total** | **108** | **228** |

All listed donations are live-mode. This is the requested creation-date breakdown, not independent confirmation of payment settlement dates.

### Monthly rows versus subscriptions

- **12 monthly donation rows received 3 audit email rows each**; **2 monthly donation rows received 1 each**: 38 total.
- **12 distinct non-null subscription IDs** represent **12 monthly donation rows** and **32 emails**. Ten subscriptions received 3 emails each; two received 1 each. No known subscription combines multiple emailed monthly donation rows in this incident.
- **2 monthly donation rows have no subscription ID** and account for **6 audit email rows** (3 each), with **3 non-null provider IDs**. Subscription-level attribution for these two rows is not possible from the donation records.
- Thus the repeated emails are repeated sends for separate donation rows, not evidence of multiple monthly donation rows being collapsed into a single known subscription.

### Audit multiplicity versus provider-ID multiplicity

Counting only distinct non-null provider IDs per recipient produces: 45 recipients with 1, 1 with 2, 56 with 3, 2 with 4+, and 1 with none. These IDs are recorded provider references, not a new provider-side verification. The database currently records 214 delivered rows.

## Matching method

1. **related_id cannot establish these links:** all 228 incident rows have a null `related_id`.
2. Every incident row links to a receipt through `email_audit_log.metadata->>'transaction_id' = sponsorship_receipts.transaction_id`.
3. Every incident row links to a donation through `email_audit_log.metadata->>'transaction_id' = 'donation_' || donations.id::text`. The incident contains 108 distinct donation IDs. The receipt join does not multiply the 228 email rows.
4. Earlier history is defined as `COALESCE(sent_at, created_at) < '2026-10-20 02:54:00+00'`, with the same normalized recipient. The first-time test considers **any email type/status recorded in the audit table**.
5. The prior-receipt test considers receipt email types or receipt-related types, matched by transaction ID, related donation ID, metadata donation ID, related receipt ID, metadata receipt ID, or metadata receipt number. Receipt IDs and receipt numbers are resolved from the linked receipt, not exposed in this report.
6. **All 208 historical duplicate rows have an earlier receipt match by metadata transaction ID.** No additional matches were contributed by the other matching paths. Earlier receipt-history metadata contains transaction ID and receipt number; there was no donation-ID metadata key in the inspected earlier history. Direct related-receipt-ID matches contributed zero.
7. All incident receipt rows and email metadata agree with the linked donations on live mode; the created-at population also had zero mode mismatches.

## Internal/test classification

SQL checked organization-associated staff-domain patterns (Best Day Ministries, Best Day Ever Coffee and Crepes, and Joy House variants), the example.com domain, domains ending in .test, recognizable test/testing/E2E/emailtest/test-role local-part patterns, and the known provider sandbox mailbox. Only counts were returned. No individual addresses or inferred staff identities were returned or stored.

This is a conservative pattern-based count, not an employee roster check. Staff using ordinary personal addresses and unmarked test accounts cannot be classified conclusively from addresses alone.

## Limits

- Historical first-time/duplicate classification is relative to retained `email_audit_log` records; emails outside this table or missing historical logs cannot be measured.
- An earlier logged receipt email is evidence of an earlier attempt/send record, not necessarily successful delivery; historical bounced or unresolved rows are not silently excluded.
- Three incident rows have no provider ID. Their delivery cannot be confirmed without additional evidence, which was not requested or permitted here.
- Two monthly donation rows lack subscription IDs; no subscription identity was guessed from recipient, customer, or amount.
- No external service was contacted. The report distinguishes audit rows, provider IDs recorded in the database, and database-recorded delivery status.

**Context Log:** aggregate privacy, no autonomous financial changes, and the request's SELECT-only investigation boundary were applied. No other project files were changed by this investigation.