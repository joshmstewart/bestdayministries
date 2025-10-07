# TERMS & CONDITIONS SYSTEM

## OVERVIEW
Enforces acceptance of Terms of Service and Privacy Policy with version tracking, automatic enforcement, and audit trail.

## DATABASE SCHEMA

**terms_acceptance**
- `user_id`, `terms_version`, `privacy_version`, `accepted_at`, `ip_address`, `user_agent`
- UNIQUE constraint on (user_id, terms_version, privacy_version)
- **RLS:** Users view/insert own, admins view all

## VERSION MANAGEMENT

**Current Versions** (`src/hooks/useTermsCheck.ts`):
```typescript
export const CURRENT_TERMS_VERSION = "1.0";
export const CURRENT_PRIVACY_VERSION = "1.0";
```

**Update Process:**
1. Increment version constants
2. Update "Last Updated" date in pages
3. Deploy → users prompted on next login

## COMPONENTS

**TermsAcceptanceDialog** (`src/components/TermsAcceptanceDialog.tsx`)
- Non-dismissible modal requiring checkbox + button click
- Links to Terms/Privacy pages in new tabs
- Calls `record-terms-acceptance` edge function
- Triggers `onAccepted()` callback on success

**TermsAcceptanceGuard** (`src/components/TermsAcceptanceGuard.tsx`)
- Wraps app in `App.tsx`, enforces terms site-wide
- Hides dialog on public pages: `/`, `/auth`, `/terms`, `/privacy`
- Reloads page after acceptance to refresh data
- Shows dialog when `needsAcceptance = true` from `useTermsCheck`

**useTermsCheck Hook** (`src/hooks/useTermsCheck.ts`)
- Returns: `{needsAcceptance, loading, recordAcceptance}`
- Queries `terms_acceptance` for user + current versions
- Updates on auth state changes

## EDGE FUNCTION

**record-terms-acceptance** (`supabase/functions/record-terms-acceptance/index.ts`)
- **Auth:** Required (JWT token)
- **Request:** `{termsVersion, privacyVersion}`
- **Process:** Authenticates user → extracts IP/user agent → inserts into `terms_acceptance`
- **Audit:** Logs IP, user agent, timestamp
- **Errors:** Ignores duplicates, returns 400 on auth/DB failure

## PAGES

**Terms of Service** (`src/pages/TermsOfService.tsx` - `/terms`)
- 16 sections: Service description, community features, sponsorships, refund policy, user conduct, marketplace, liability, etc.
- Version 1.0, Last Updated: January 6, 2025

**Privacy Policy** (`src/pages/PrivacyPolicy.tsx` - `/privacy`)
- 16 sections: Data collection, payment processing, privacy rights, donor privacy, CCPA/GDPR compliance, etc.
- Version 1.0, Last Updated: January 6, 2025
- Emphasizes donor privacy and 7-year IRS retention

## USER WORKFLOWS

**First-Time User:**
1. Signup → redirected to protected page
2. Dialog appears (no acceptance record)
3. Check "I agree" → Click "Accept & Continue"
4. Edge function records → page reloads

**Existing User After Version Update:**
1. Version incremented in code
2. Login → `useTermsCheck` finds no record for new version
3. Dialog appears → user re-accepts
4. New record created, old records preserved

**Guest Sponsor:**
1. Guest sponsors without account (no terms required)
2. Later creates account → dialog appears on first login
3. Accepts terms → full access granted

## ADMIN FEATURES

**User Management** - View acceptance status per user (version, date)
**Compliance Reporting** - Full audit trail (user ID, timestamp, IP, user agent, versions)
**Export** - Query `terms_acceptance` table, filter by date, export to CSV

## SECURITY & COMPLIANCE

**Legal Requirements:**
- Audit trail (IP, user agent, timestamp)
- Version tracking (separate Terms/Privacy versions)
- Explicit consent (checkbox + button)
- Non-repudiation (unique DB constraint)
- RLS policies prevent tampering

**Data Protection:** HTTPS, encrypted at rest, RLS enforcement, no deletion
**GDPR:** User access to records, consent before processing, clear mechanism
**CCPA:** Disclosure in Privacy Policy, no personal data sales

## TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| Dialog appears every load | Check edge function logs, verify RLS policies |
| Can't close dialog | Intentional - must accept or logout |
| Acceptance fails | Check console, verify auth, retry |
| Shows on `/terms` page | Verify `publicPages` array in guard |
| Old users not prompted | Increment version constants |
| Duplicate errors | Safe to ignore (already accepted) |
| IP shows "unknown" | Expected behind proxies |

## UPDATING TERMS/PRIVACY

**Checklist:**
1. Update content in page component
2. Update "Last Updated" date
3. Increment version in `useTermsCheck.ts`
4. Update version display in page header
5. Test: new user + existing user see dialog
6. Verify record in `terms_acceptance` table
7. Deploy + monitor logs

**Testing:** Create test user → accept v1.0 → increment to v1.1 → logout/login → should prompt again → verify two DB records

## KEY DESIGN DECISIONS

**Non-Dismissible Dialog:** Legal requirement, proves user awareness
**Page Reload:** Ensures fresh data, avoids state sync issues
**IP Logging:** Legal proof, fraud detection, compliance
**Unique Constraint:** Prevents duplicates, maintains audit clarity
**Edge Function:** Adds audit metadata (IP, user agent) to DB records

---

**Last Updated:** After implementing complete terms acceptance system with version tracking, audit trail, and enforcement
