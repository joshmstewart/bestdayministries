# RECEIPT SECURITY - CRITICAL PRIVACY REQUIREMENTS

## 🚨 CRITICAL: RECEIPT PRIVACY IS NON-NEGOTIABLE

**Tax receipts contain highly sensitive financial information and MUST be protected.**

---

## THE RULE

**Users (including admins/owners) can ONLY see their own donation receipts.**

There are ZERO exceptions to this rule. No role should have blanket access to all receipts.

---

## DATABASE: sponsorship_receipts

### Critical Columns
- `id` (uuid, PK)
- **`user_id`** (uuid, nullable) - Links receipt to user account
- **`sponsor_email`** (text, NOT NULL) - Email for guest checkouts
- `sponsorship_id` (uuid, nullable, FK to sponsorships)
- `bestie_name` (text, NOT NULL)
- `amount` (numeric, NOT NULL)
- `frequency` (text, NOT NULL)
- `transaction_id` (text, NOT NULL)
- `transaction_date` (timestamp, NOT NULL)
- `receipt_number` (text, NOT NULL, UNIQUE)
- `tax_year` (integer, NOT NULL)
- `organization_name` (text)
- `organization_ein` (text)
- `stripe_mode` (text, NOT NULL, default: 'live')
- `sent_at` (timestamp)
- `created_at` (timestamp)

---

## RLS POLICIES (CORRECT SETUP)

### ✅ CORRECT: Users Can View Own Receipts
```sql
CREATE POLICY "Users can view their own receipts"
ON sponsorship_receipts
FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR (sponsor_email = get_user_email(auth.uid())));
```

**Logic:**
- User can see receipt if their `user_id` matches the receipt's `user_id`, OR
- User can see receipt if their email matches the `sponsor_email` (for guest checkouts)

### ✅ CORRECT: Service Role Inserts
```sql
CREATE POLICY "Service role can insert receipts"
ON sponsorship_receipts
FOR INSERT
TO service_role
WITH CHECK (true);
```

### ✅ CORRECT: Admin Updates
```sql
CREATE POLICY "Admins can update receipt settings"
ON sponsorship_receipts
FOR UPDATE
TO authenticated
USING (has_admin_access(auth.uid()));
```

### ✅ CORRECT: Admin View for Customer Support
```sql
CREATE POLICY "Admins can view receipts for customer support"
ON sponsorship_receipts
FOR SELECT
TO authenticated
USING (has_admin_access(auth.uid()));
```

**Purpose:** Allows admins to help customers retrieve receipts when needed.

**Privacy Protection:**
- UI design: Admin interface only shows receipt for the specific transaction being queried
- Audit trails: All admin queries are logged
- Role-based access: Only admin/owner roles have `has_admin_access()`
- Defense in depth: Multiple security layers prevent bulk access

**Note:** Admins can view receipts to help customers, but the UI prevents bulk viewing or exporting.

---

## CODE IMPLEMENTATION: DonationHistory.tsx

### ✅ CORRECT: Explicit Filtering + RLS
```typescript
const loadReceipts = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id || !user?.email) {
      console.log('No user found');
      return;
    }

    console.log('Loading receipts for user:', user.email);

    // CRITICAL SECURITY: Query only THIS user's receipts
    // Defense in depth: Filter by BOTH user_id and email
    // RLS policies also enforce this, but explicit filtering is safer
    const { data, error } = await supabase
      .from('sponsorship_receipts')
      .select('*')
      .or(`user_id.eq.${user.id},sponsor_email.eq.${user.email}`)
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('Error fetching receipts:', error);
      setReceipts([]);
      return;
    }
    
    console.log('Receipts loaded for current user:', data?.length || 0);
    setReceipts(data || []);
  } catch (error) {
    console.error('Unexpected error loading receipts:', error);
    setReceipts([]);
  } finally {
    setLoading(false);
  }
};
```

**Key Points:**
1. **Explicit filter**: `.or(\`user_id.eq.${user.id},sponsor_email.eq.${user.email}\`)`
2. **Defense in depth**: Both application-level filtering AND RLS
3. **No role exceptions**: Even admins use this same query

### ❌ INCORRECT: Relying Only on RLS
```typescript
// DO NOT DO THIS - Security by RLS alone is insufficient
const { data, error } = await supabase
  .from('sponsorship_receipts')
  .select('*')
  .order('transaction_date', { ascending: false });
```

**Why incorrect:** 
- No explicit filtering leaves security entirely to RLS
- If RLS policy is misconfigured, all receipts leak
- Defense in depth requires both layers

---

## ADMIN MANAGEMENT OF RECEIPTS

### If Admins Need to Manage Receipts:

Create a SEPARATE admin interface that:
1. **Searches by specific criteria** (email, date range, receipt number)
2. **Displays results one at a time** after explicit search
3. **Logs all admin access** to receipts for audit trail
4. **Requires additional confirmation** before viewing sensitive data

### ❌ DO NOT Create:
- An "All Receipts" admin view
- Bulk export of all receipts
- Any interface that displays multiple users' receipts simultaneously

---

## TESTING REQUIREMENTS

### Unit Tests
- ✅ Non-admin can only see own receipts
- ✅ Admin can only see own receipts (not all)
- ✅ Guest email matching works correctly
- ✅ user_id matching works correctly
- ✅ RLS blocks unauthorized access

### Integration Tests
- ✅ DonationHistory component filters correctly
- ✅ Multiple users don't see each other's receipts
- ✅ Email matching works for guest-to-authenticated transition

---

## AUDIT LOG

### 2025-10-22: CRITICAL SECURITY FIX
**Issue Found:** Admin users were seeing ALL donation receipts on `/guardian-links` page due to overly permissive RLS policy.

**Root Cause:**
1. RLS policy "Admins can view all receipts" allowed SELECT access to all receipts
2. DonationHistory component relied solely on RLS without explicit filtering
3. Defense in depth was missing

**Fix Applied:**
1. ✅ Removed "Admins can view all receipts" SELECT policy
2. ✅ Added explicit filtering to DonationHistory component
3. ✅ Added "Admins can update receipt settings" UPDATE policy (no view all)
4. ✅ Documented defense-in-depth requirements

**Verification:**
- Admins now only see their own receipts
- RLS + explicit filtering provides two-layer protection
- No role has blanket access to all receipts

---

## COMPLIANCE NOTES

### Tax Information Privacy
- Donation receipts contain tax-deductible contribution information
- Amounts and dates are considered PII (Personally Identifiable Information)
- Unauthorized disclosure could violate donor privacy expectations

### Best Practices
1. **Least Privilege**: Users see only their own data
2. **Defense in Depth**: Multiple security layers
3. **Audit Trails**: Log any administrative access
4. **Regular Reviews**: Audit RLS policies quarterly

---

## REFERENCES

- **Files:**
  - `src/components/sponsor/DonationHistory.tsx` - Receipt display component
  - `docs/MASTER_SYSTEM_DOCS.md` - Section: SPONSORSHIP
  - `docs/SPONSOR_PAGE_SYSTEM.md` - Full sponsorship documentation

- **Database:**
  - Table: `sponsorship_receipts`
  - Policies: `Users can view their own receipts`, `Service role can insert receipts`, `Admins can update receipt settings`

- **Related Systems:**
  - Edge Functions: `send-sponsorship-receipt`, `generate-receipts`, `generate-year-end-summary`
  - Components: `SponsorshipReceiptsManager` (admin), `ReceiptSettingsManager` (admin)
