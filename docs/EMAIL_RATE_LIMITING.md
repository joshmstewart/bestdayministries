# Email Rate Limiting Guide

## Overview

All email-sending edge functions MUST implement rate limiting to respect Resend's API limits (2 requests per second). This guide documents the standard pattern and shared utilities.

## The Problem

Without rate limiting:
- Resend API returns 429 errors when limit exceeded
- Emails silently fail to send
- Users miss critical notifications
- Bulk operations (newsletters, event notifications) fail mid-send

## Resend Rate Limits

| Plan | Rate Limit |
|------|------------|
| Free | 2 req/sec |
| Pro | 10 req/sec |
| Enterprise | Higher |

**We use 600ms delay between sends (~1.6 req/sec) to safely stay under the limit.**

## Shared Utility

All email functions should use the shared rate limiter:

```typescript
import { 
  emailDelay, 
  RESEND_RATE_LIMIT_MS, 
  logRateLimitInfo 
} from "../_shared/emailRateLimiter.ts";
```

### Available Exports

| Export | Value | Description |
|--------|-------|-------------|
| `RESEND_RATE_LIMIT_MS` | 600 | Delay in ms between emails |
| `RESEND_BATCH_DELAY_MS` | 1000 | Extra delay between batches |
| `RESEND_MAX_BATCH_SIZE` | 50 | Max emails per batch |
| `emailDelay(ms?)` | Promise | Wait function (defaults to 600ms) |
| `logRateLimitInfo(fn, count)` | void | Log estimated time for bulk sends |

## Standard Pattern

### For Queue Processors

```typescript
import { emailDelay, RESEND_RATE_LIMIT_MS } from "../_shared/emailRateLimiter.ts";

for (let i = 0; i < queueItems.length; i++) {
  const item = queueItems[i];
  
  // Rate limiting: wait between sends (Resend allows 2 req/sec)
  if (i > 0) {
    await emailDelay(RESEND_RATE_LIMIT_MS);
  }
  
  try {
    await sendEmail(item);
    processed++;
  } catch (error) {
    errors++;
  }
}
```

### For Bulk Operations (Newsletters, Broadcasts)

```typescript
import { 
  emailDelay, 
  RESEND_RATE_LIMIT_MS, 
  logRateLimitInfo 
} from "../_shared/emailRateLimiter.ts";

// Log estimated completion time
logRateLimitInfo('send-newsletter', recipients.length);

for (let i = 0; i < recipients.length; i++) {
  if (i > 0) {
    await emailDelay(RESEND_RATE_LIMIT_MS);
  }
  
  await resend.emails.send({ ... });
  
  // Progress logging every 50 emails
  if ((i + 1) % 50 === 0) {
    console.log(`Progress: ${i + 1}/${recipients.length}`);
  }
}
```

## Functions With Rate Limiting

All these functions now implement proper rate limiting:

| Function | Type | Rate Limited |
|----------|------|--------------|
| `process-event-email-queue` | Queue | ✅ 600ms |
| `process-event-update-email-queue` | Queue | ✅ 600ms |
| `process-sponsorship-email-queue` | Queue | ✅ 600ms |
| `process-badge-earned-email-queue` | Queue | ✅ 600ms |
| `process-content-like-email-queue` | Queue | ✅ 600ms |
| `send-newsletter` | Bulk | ✅ 600ms |
| `send-digest-email` | Bulk | ✅ 600ms |
| `send-batch-year-end-summaries` | Bulk | ✅ 600ms |
| `broadcast-product-update` | Bulk | ✅ 600ms |
| `send-order-confirmation` | Multi | ✅ 600ms |
| `send-order-shipped` | Multi | ✅ 600ms |
| `send-vendor-application-email` | Multi | ✅ 600ms |
| `prayer-expiry-notifications` | Multi | ✅ 600ms |

## Single Email Functions

These send individual emails (no loops) and don't need rate limiting:
- `send-notification-email`
- `send-approval-notification`
- `send-message-notification`
- `send-prayer-notification`
- `notify-admin-new-contact`
- `notify-admin-assignment`
- `send-contact-email`
- `send-contact-reply`
- `send-vendor-order-notification`
- `send-sponsorship-receipt`
- `send-password-reset`
- `send-test-newsletter`
- `send-test-automated-template`
- `send-automated-campaign`
- `send-digest-email-test`
- `send-corrected-receipts` (uses invoke pattern)
- `send-missing-receipt-emails` (uses invoke pattern)
- `generate-year-end-summary`
- `process-inbound-email`

## Anti-Patterns

### ❌ DON'T: Fire-and-forget parallel calls
```typescript
// BAD - will hit rate limits
users.forEach(user => {
  resend.emails.send({ to: user.email, ... });
});
```

### ❌ DON'T: Promise.all without batching
```typescript
// BAD - sends all at once
await Promise.all(users.map(u => resend.emails.send({ ... })));
```

### ✅ DO: Sequential with delays
```typescript
// GOOD - respects rate limits
for (let i = 0; i < users.length; i++) {
  if (i > 0) await emailDelay(RESEND_RATE_LIMIT_MS);
  await resend.emails.send({ to: users[i].email, ... });
}
```

## Estimated Times

| Recipients | Time at 600ms/email |
|------------|---------------------|
| 10 | ~6 seconds |
| 50 | ~30 seconds |
| 100 | ~1 minute |
| 200 | ~2 minutes |
| 500 | ~5 minutes |

## Testing

When testing bulk email functions:
1. Use test mode to limit recipients
2. Check logs for rate limit warnings
3. Verify all emails were sent (check `email_notifications_log`)

## Adding New Email Functions

When creating a new edge function that sends emails:

1. **Determine type**: Single email or bulk?
2. **Import the utility**: `import { emailDelay, RESEND_RATE_LIMIT_MS } from "../_shared/emailRateLimiter.ts";`
3. **Add rate limiting**: Use the standard loop pattern
4. **Add progress logging**: For bulk operations
5. **Update this doc**: Add to the functions table

## Troubleshooting

### "Rate limit exceeded" errors
- Increase delay to 700-800ms temporarily
- Check if multiple functions running simultaneously
- Consider staggering cron job schedules

### Emails timing out
- Edge functions have 60s timeout by default
- For large sends, consider:
  - Using queue-based approach
  - Breaking into smaller batches
  - Increasing function timeout in config.toml
