# TERMS & CONDITIONS SYSTEM - COMPLETE DOCUMENTATION

## OVERVIEW
Enforces user acceptance of Terms of Service and Privacy Policy with version tracking, automatic enforcement, and audit trail logging.

---

## DATABASE SCHEMA

### terms_acceptance Table

**Columns:**
- `id` (UUID, primary key)
- `user_id` (UUID, references auth.users) - User who accepted
- `terms_version` (TEXT) - Version of Terms accepted (e.g., "1.0")
- `privacy_version` (TEXT) - Version of Privacy Policy accepted (e.g., "1.0")
- `accepted_at` (TIMESTAMP) - When acceptance occurred
- `ip_address` (TEXT, nullable) - Client IP for audit trail
- `user_agent` (TEXT, nullable) - Browser/device for audit trail

**Constraints:**
- UNIQUE(user_id, terms_version, privacy_version) - Prevents duplicate acceptance records

**Indexes:**
- `idx_terms_acceptance_user_id` - Fast lookups by user
- `idx_terms_acceptance_versions` - Fast version queries

**RLS Policies:**
- **Users can view their own acceptance:** `SELECT WHERE user_id = auth.uid()`
- **Users can create their own acceptance:** `INSERT WITH CHECK user_id = auth.uid()`
- **Admins can view all acceptance:** `SELECT USING has_admin_access(auth.uid())`

---

## VERSION MANAGEMENT

### Current Versions
Defined in `src/hooks/useTermsCheck.ts`:
```typescript
export const CURRENT_TERMS_VERSION = "1.0";
export const CURRENT_PRIVACY_VERSION = "1.0";
```

**Also stored in app_settings table:**
- `current_terms_version` → "1.0"
- `current_privacy_version` → "1.0"

### Version Update Process
1. **Update version constants** in `useTermsCheck.ts`
2. **Update "Last Updated" date** in Terms/Privacy pages
3. **Update version display** in page headers (e.g., "Version 1.0")
4. **Deploy changes** - All users will be prompted on next login
5. **System automatically** detects missing acceptance for new versions

**CRITICAL:** Both version constants MUST be updated together when either document changes.

---

## COMPONENTS

### TermsAcceptanceDialog
**Location:** `src/components/TermsAcceptanceDialog.tsx`

**Purpose:** Modal dialog that blocks app usage until terms accepted

**Features:**
- **Non-dismissible:** Cannot close without accepting (no X button, prevents click outside)
- **Checkbox requirement:** Must check "I agree" before accepting
- **Direct links:** Opens Terms and Privacy in new tabs for review
- **Loading state:** Prevents double-submission during processing
- **Error handling:** Shows toast if acceptance fails, allows retry

**Props:**
```typescript
interface TermsAcceptanceDialogProps {
  isOpen: boolean;           // Controls dialog visibility
  onAccepted: () => void;    // Callback after successful acceptance
}
```

**Acceptance Flow:**
1. User checks "I agree" checkbox
2. Clicks "Accept & Continue" button
3. Calls `record-terms-acceptance` edge function
4. On success: Shows toast, triggers `onAccepted()` callback
5. On failure: Shows error toast, keeps dialog open for retry

### TermsAcceptanceGuard
**Location:** `src/components/TermsAcceptanceGuard.tsx`

**Purpose:** Wrapper component that enforces terms acceptance site-wide

**Implementation:**
```typescript
// In App.tsx
<TermsAcceptanceGuard>
  <RouterProvider router={router} />
</TermsAcceptanceGuard>
```

**Logic:**
1. Checks authentication state on mount and auth changes
2. Verifies if current user needs to accept terms
3. Shows dialog if:
   - User is logged in
   - Not on public pages (`/`, `/auth`, `/terms`, `/privacy`)
   - `needsAcceptance = true` from `useTermsCheck` hook
4. Blocks interaction with app content until acceptance
5. Reloads page after acceptance to refresh all data

**Public Pages (Dialog Hidden):**
- `/` - Homepage
- `/auth` - Regular authentication
- `/auth/vendor` - Vendor authentication
- `/terms` - Terms of Service page
- `/privacy` - Privacy Policy page

**Why Reload After Acceptance:**
- Ensures all components fetch fresh data
- Prevents stale state issues
- Simpler than manual state updates across app

---

## HOOKS

### useTermsCheck
**Location:** `src/hooks/useTermsCheck.ts`

**Purpose:** Checks if user needs to accept current terms/privacy versions

**Returns:**
```typescript
{
  needsAcceptance: boolean;      // True if user hasn't accepted current versions
  loading: boolean;              // True while checking database
  recordAcceptance: () => void;  // Function to record acceptance (alternative to edge function)
}
```

**Logic:**
1. Queries `terms_acceptance` table for records matching:
   - `user_id` = current user
   - `terms_version` = CURRENT_TERMS_VERSION
   - `privacy_version` = CURRENT_PRIVACY_VERSION
2. If record exists → `needsAcceptance = false`
3. If no record → `needsAcceptance = true`
4. Updates on auth state changes (login/logout)

**Used By:**
- `TermsAcceptanceGuard` - To determine if dialog should show
- `UserManagement` (admin) - To view user acceptance status

---

## EDGE FUNCTION

### record-terms-acceptance
**Location:** `supabase/functions/record-terms-acceptance/index.ts`

**Authentication:** Required (uses JWT token from Authorization header)

**Request Body:**
```typescript
{
  termsVersion: string;    // e.g., "1.0"
  privacyVersion: string;  // e.g., "1.0"
}
```

**Process:**
1. Authenticates user via `supabase.auth.getUser()`
2. Extracts IP address from headers:
   - Tries `x-forwarded-for` (for proxies)
   - Falls back to `x-real-ip`
   - Defaults to "unknown"
3. Extracts user agent from `user-agent` header
4. Inserts record into `terms_acceptance` table:
   - `user_id` = authenticated user ID
   - `terms_version` = provided version
   - `privacy_version` = provided version
   - `ip_address` = extracted IP
   - `user_agent` = extracted agent
   - `accepted_at` = now() (automatic)
5. Returns success or error response

**Error Handling:**
- Duplicate acceptance (UNIQUE constraint) - Safe to ignore (already accepted)
- Authentication failure - Returns 400 error
- Database error - Returns 400 with error message

**Audit Trail:**
- IP address logged for legal compliance
- User agent logged for device tracking
- Timestamp automatic via database default

---

## PAGES

### Terms of Service
**Location:** `src/pages/TermsOfService.tsx`
**Route:** `/terms`

**Content Sections:**
1. Agreement to Terms
2. Description of Service (community, events, marketplace, sponsorships)
3. Community Features (posts, events, messaging, guardian controls)
4. Sponsorship Program (commitments, payments, subscriptions, fund usage, donor privacy)
5. Refund Policy (one-time, monthly, disputes, tax deductibility)
6. User Accounts (creation, guest sponsorships, security)
7. User Conduct (prohibited activities)
8. Content and Intellectual Property
9. Marketplace and Vendor Terms
10. Limitation of Liability
11. Indemnification
12. Changes to Terms
13. Termination
14. Governing Law
15. Contact Information
16. Entire Agreement

**Key Features:**
- Version displayed in header: "Version 1.0"
- Last Updated date: "January 6, 2025"
- Links to Privacy Policy
- Contact information card
- Organized with separators between sections

### Privacy Policy
**Location:** `src/pages/PrivacyPolicy.tsx`
**Route:** `/privacy`

**Content Sections:**
1. Introduction
2. Information We Collect (provided + automatic)
3. How We Use Your Information
4. Payment Processing (Stripe integration, PCI compliance)
5. Information Sharing and Disclosure
6. Data Security
7. Your Privacy Rights (access, deletion, marketing, portability, cookies)
8. Children's Privacy
9. Retention of Information (7-year IRS requirement)
10. Donor Privacy (sponsor anonymity, no public sharing)
11. Third-Party Links
12. International Data Transfers
13. Changes to This Privacy Policy
14. Contact Us
15. California Privacy Rights (CCPA)
16. GDPR Compliance (EU users)

**Key Features:**
- Version displayed in header: "Version 1.0"
- Last Updated date: "January 6, 2025"
- Emphasizes donor privacy (Section 10)
- Retention periods specified
- CCPA and GDPR compliance sections

---

## USER WORKFLOWS

### First-Time User Registration
1. User signs up via `/auth` page
2. Account created successfully
3. Redirected to protected page (e.g., `/community`)
4. `TermsAcceptanceGuard` detects no acceptance record
5. Dialog appears (non-dismissible)
6. User reads Terms (opens in new tab) and Privacy (opens in new tab)
7. Checks "I agree" checkbox
8. Clicks "Accept & Continue"
9. Edge function records acceptance
10. Page reloads → user can access app

### Existing User After Version Update
1. Terms/Privacy updated (version incremented in code)
2. User logs in
3. `useTermsCheck` queries for new version acceptance
4. No record found → `needsAcceptance = true`
5. Dialog appears on first protected page visit
6. User must re-accept updated terms
7. New acceptance record created with new version numbers
8. Old acceptance records remain (audit trail)

### Guest Sponsor (No Account)
1. Guest sponsors via Stripe checkout
2. No account = No terms acceptance required yet
3. Guest later creates account with same email
4. On first login after account creation:
   - `TermsAcceptanceGuard` checks for acceptance
   - None found → dialog appears
   - User accepts terms
   - Can now access full app features

---

## ADMIN FEATURES

### Viewing User Acceptance Status
**Location:** Admin → User Management

**Display:**
- Shows most recent terms acceptance per user
- Columns: Terms Version, Privacy Version, Accepted Date
- Useful for compliance audits
- Can identify users who haven't accepted (no record)

**Query Pattern:**
```typescript
const { data: termsData } = await supabase
  .from("terms_acceptance")
  .select("user_id, terms_version, privacy_version, accepted_at")
  .order("accepted_at", { ascending: false });

// Group by user_id, take most recent
const termsMap = new Map();
termsData?.forEach(term => {
  if (!termsMap.has(term.user_id)) {
    termsMap.set(term.user_id, term);
  }
});
```

### Compliance Reporting
**Purpose:** Prove legal compliance if required

**Data Available:**
- User ID + acceptance timestamp
- IP address at time of acceptance
- User agent (browser/device)
- Versions accepted
- Complete audit trail

**Export Options:**
- Query `terms_acceptance` table directly
- Filter by date range
- Export to CSV for legal records

---

## SECURITY & COMPLIANCE

### Legal Requirements Met
✅ **Audit Trail:** IP address, user agent, timestamp
✅ **Version Tracking:** Separate versions for Terms and Privacy
✅ **User Consent:** Explicit checkbox + button click
✅ **Non-Repudiation:** Database record with unique constraint
✅ **Access Controls:** RLS policies prevent tampering

### Data Protection
- **Encrypted in transit:** HTTPS only
- **Encrypted at rest:** Supabase default encryption
- **Access limited:** RLS policies enforce row-level security
- **Admin oversight:** Admins can view all acceptance for audits
- **No deletion:** Records never deleted (audit trail)

### GDPR Compliance
- Users can view their own acceptance records
- Acceptance required before data processing
- Clear consent mechanism (checkbox + explicit action)
- Right to know how data is used (Privacy Policy)
- Contact info provided for data requests

### CCPA Compliance
- Privacy Policy discloses data collection
- Users informed of data usage
- No sale of personal information (explicitly stated)
- Contact info for privacy questions

---

## TROUBLESHOOTING

| Issue | Cause | Solution |
|-------|-------|----------|
| Dialog appears every page load | Acceptance not saving | Check edge function logs, verify RLS policies |
| Can't close dialog | Intentional design | Must accept terms or logout |
| "Failed to record acceptance" error | Network or auth issue | Check console logs, retry, verify authentication |
| Dialog shows on `/terms` page | Public page check missing | Verify `publicPages` array in `TermsAcceptanceGuard` |
| Old users not prompted | Version not updated | Increment version constants in `useTermsCheck.ts` |
| Duplicate acceptance errors | UNIQUE constraint | Safe to ignore, user already accepted that version |
| IP shows as "unknown" | No proxy headers | Expected behind some proxies, not critical |
| Reload causes user confusion | State management issue | Reload necessary to ensure fresh data after acceptance |

---

## UPDATING TERMS/PRIVACY

### Process Checklist
1. ✅ Update content in `TermsOfService.tsx` or `PrivacyPolicy.tsx`
2. ✅ Update "Last Updated" date in page header
3. ✅ Increment version number in `useTermsCheck.ts`:
   - `CURRENT_TERMS_VERSION = "1.1"` (if Terms changed)
   - `CURRENT_PRIVACY_VERSION = "1.1"` (if Privacy changed)
4. ✅ Update version display in page headers (e.g., "Version 1.1")
5. ✅ Test on staging:
   - Create new user → should see dialog
   - Login existing user → should see dialog
   - Accept terms → dialog should disappear
   - Verify record in `terms_acceptance` table
6. ✅ Deploy to production
7. ✅ Monitor edge function logs for errors
8. ✅ Notify team of update (optional)

### Testing New Versions
**Test Account Flow:**
1. Create test user account
2. Accept terms (version 1.0)
3. Update version to 1.1 in code
4. Logout and login again
5. Should see dialog again
6. Accept terms
7. Verify two records in database:
   - One for version 1.0
   - One for version 1.1

**Database Verification:**
```sql
SELECT * FROM terms_acceptance 
WHERE user_id = 'test-user-uuid' 
ORDER BY accepted_at DESC;
```

---

## FUTURE ENHANCEMENTS

- [ ] Email notification when terms updated
- [ ] Diff view showing what changed
- [ ] Grace period before enforcement (e.g., 7 days)
- [ ] Admin dashboard for acceptance statistics
- [ ] Export compliance reports
- [ ] Separate acceptance for each document (Terms independent of Privacy)
- [ ] Multi-language support
- [ ] In-app terms viewer (instead of new tab)
- [ ] Reminder notifications for non-compliant users
- [ ] Bulk email to users about updates

---

## KEY DESIGN DECISIONS

### Why Non-Dismissible Dialog?
- **Legal requirement:** Explicit acceptance needed
- **User protection:** Ensures users aware of terms
- **Compliance:** Can prove user saw and accepted

### Why Full Page Reload?
- **Simplicity:** Avoids complex state synchronization
- **Reliability:** Ensures all components have fresh data
- **User experience:** Clear "fresh start" after acceptance

### Why Store IP Address?
- **Legal proof:** Shows where acceptance originated
- **Fraud prevention:** Detect suspicious patterns
- **Compliance:** Some jurisdictions require geo-tracking

### Why Unique Constraint on Versions?
- **Prevents duplicates:** User can't accept same version twice
- **Audit clarity:** One clear acceptance per version
- **Database integrity:** Enforces data quality

### Why Both Database AND Edge Function?
- **Database:** Stores historical acceptance records
- **Edge Function:** Adds audit metadata (IP, user agent)
- **Separation:** Edge function handles auth, DB handles storage

---

**Last Updated:** After implementing complete terms acceptance system with version tracking, audit trail, and enforcement
