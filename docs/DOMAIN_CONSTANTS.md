# Domain Constants - Single Source of Truth

## ⚠️ CRITICAL: Our domain is bestdayministries.ORG (not .com!)

This document describes the centralized domain constants system that prevents hardcoding the wrong domain.

## Files

### Frontend: `src/lib/domainConstants.ts`
Use in React components and frontend code:
```typescript
import { PRIMARY_DOMAIN, EMAILS, URLS, ORGANIZATION_NAME } from "@/lib/domainConstants";

// Available emails
EMAILS.noreply      // noreply@bestdayministries.org
EMAILS.support      // support@bestdayministries.org
EMAILS.info         // info@bestdayministries.org
EMAILS.contact      // contact@bestdayministries.org
EMAILS.notifications // notifications@bestdayministries.org
EMAILS.orders       // orders@bestdayministries.org

// URLs
URLS.main  // https://bestdayministries.org
URLS.www   // https://www.bestdayministries.org

// Organization
ORGANIZATION_NAME  // "Best Day Ministries"
```

### Edge Functions: `supabase/functions/_shared/domainConstants.ts`
Use in Supabase Edge Functions:
```typescript
import { EMAILS, SENDERS, ORGANIZATION_NAME } from "../_shared/domainConstants.ts";

// Pre-formatted senders for Resend
SENDERS.notifications  // "Notifications <notifications@bestdayministries.org>"
SENDERS.community      // "Community Notifications <notifications@bestdayministries.org>"
SENDERS.noreply        // "Best Day Ministries <noreply@bestdayministries.org>"
SENDERS.store          // "Joy House Store <orders@bestdayministries.org>"
SENDERS.contact        // "Best Day Ministries <contact@bestdayministries.org>"
```

## Usage Rules

### ✅ DO:
- Always import from `domainConstants.ts` when referencing the domain
- Use `EMAILS.*` for email addresses
- Use `SENDERS.*` for pre-formatted Resend sender strings
- Use `URLS.*` for full URLs

### ❌ DON'T:
- Hardcode `bestdayministries.org` anywhere
- Hardcode `bestdayministries.com` (this is WRONG!)
- Create email addresses by string concatenation

## Backwards Compatibility

The old `src/lib/publicSiteUrl.ts` file re-exports from `domainConstants.ts` for backwards compatibility. New code should import directly from `domainConstants.ts`.

## Adding New Email Addresses

If you need a new email address (e.g., `hello@bestdayministries.org`):

1. Add to `src/lib/domainConstants.ts`:
```typescript
export const EMAILS = {
  // ... existing
  hello: `hello@${PRIMARY_DOMAIN}`,
} as const;
```

2. Add to `supabase/functions/_shared/domainConstants.ts`:
```typescript
export const EMAILS = {
  // ... existing
  hello: `hello@${PRIMARY_DOMAIN}`,
} as const;

export const SENDERS = {
  // ... existing
  hello: `Hello Team <${EMAILS.hello}>`,
} as const;
```

## Migration Notes

Many edge functions still have hardcoded domains. When modifying an edge function, update it to use the shared constants:

```typescript
// BEFORE (bad)
from: "Notifications <notifications@bestdayministries.org>"

// AFTER (good)
import { SENDERS } from "../_shared/domainConstants.ts";
from: SENDERS.notifications
```
