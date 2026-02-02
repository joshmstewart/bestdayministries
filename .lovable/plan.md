
# Fix Newsletter Subscription Display & Linking

## Problem Summary
The Admin Users list shows many users as not subscribed to the newsletter. Investigation reveals three issues:

**Issue 1 - Display Bug (10 users affected)**
- 10 users have active newsletter subscriptions linked by **email only** (not `user_id`)
- The UI only checks `user_id`, so these appear as unsubscribed
- Fix: Update display query to check both `user_id` AND email

**Issue 2 - Widget Linking Gap**
- When a **logged-in user** subscribes via `NewsletterSignup` widget, their `user_id` is not captured
- The subscription is created with email only
- Fix: Detect active session and include `user_id` when available

**Issue 3 - Admin Create User Gap**
- When admins create users via "Create User" dialog, those users are never subscribed to newsletter
- Fix: Add newsletter option to create-user flow (defaulted to checked)

**Current Subscription Stats:**
| Metric | Count |
|--------|-------|
| Total user profiles | 213 |
| Subscribed (by user_id) | 155 |
| Subscribed (by email only) | 10 |
| **Total actually subscribed** | **165 (77%)** |
| Currently showing in UI | 155 |

**Confirmation:** This will NOT add non-user subscribers to the user list. The 1,229 newsletter subscribers without `user_id` are legitimately non-users (from `bulk_import` and `website_signup` who never created accounts).

---

## Changes

### Part 1: Fix Display in UserManagement.tsx
Update the newsletter subscription lookup to match by BOTH `user_id` AND email:

```typescript
// Fetch newsletter subscriptions - include email for matching
const { data: newsletterData } = await supabase
  .from("newsletter_subscribers")
  .select("user_id, email, status")  // Add email
  .eq("status", "active");

// Create sets for both user_id and email lookup
const subscribedUserIds = new Set(
  newsletterData?.filter(n => n.user_id).map(n => n.user_id) || []
);
const subscribedEmails = new Set(
  newsletterData?.map(n => n.email?.toLowerCase()).filter(Boolean) || []
);

// Update merge logic to check both
newsletter_subscribed: subscribedUserIds.has(profile.id) || 
                       subscribedEmails.has(profile.email?.toLowerCase()),
```

### Part 2: Fix NewsletterSignup Widget
Check for active session and include `user_id` when available:

```typescript
// In subscribeMutation
const { data: { session } } = await supabase.auth.getSession();

const { error } = await supabase.from("newsletter_subscribers").insert({
  email,
  user_id: session?.user?.id || null,  // Link to user if logged in
  location_city: city || null,
  // ... rest of fields
});
```

### Part 3: Update Admin Create User Flow
Add newsletter subscription option to `create-user` edge function and UI:

**Edge Function Changes:**
```typescript
// Add to validation schema
subscribeToNewsletter: z.boolean().optional().default(true),

// After user creation
if (subscribeToNewsletter) {
  await supabaseAdmin.from("newsletter_subscribers").upsert({
    email,
    user_id: newUser.user.id,
    status: 'active',
    source: 'admin_created',
  }, { onConflict: 'email' });
  
  // Trigger welcome email
  await supabaseAdmin.functions.invoke('send-automated-campaign', {
    body: { trigger_event: 'newsletter_signup', recipient_email: email }
  });
}
```

**UI Changes in Create User Dialog:**
```tsx
<div className="flex items-center space-x-2">
  <Checkbox
    id="subscribeToNewsletter"
    checked={formData.subscribeToNewsletter}
    onCheckedChange={(checked) =>
      setFormData({ ...formData, subscribeToNewsletter: !!checked })
    }
  />
  <Label htmlFor="subscribeToNewsletter">Subscribe to newsletter</Label>
</div>
```

### Part 4: Backfill Missing user_id Links
Run a one-time SQL update to link the 10 existing email-only subscriptions:

```sql
UPDATE newsletter_subscribers ns
SET user_id = p.id
FROM profiles p
WHERE LOWER(ns.email) = LOWER(p.email)
  AND ns.user_id IS NULL;
```

---

## Files to Modify

1. **`src/components/admin/UserManagement.tsx`**
   - Update newsletter query to include email field
   - Create email-based Set for matching
   - Update merge logic to check both
   - Add newsletter checkbox to Create User dialog form

2. **`src/components/NewsletterSignup.tsx`**
   - Add session check at start of mutation
   - Include `user_id` in insert when session exists

3. **`supabase/functions/create-user/index.ts`**
   - Add `subscribeToNewsletter` to validation schema
   - Insert newsletter subscription when creating user
   - Trigger welcome email

4. **Database Migration**
   - Backfill existing records to link `user_id` via email

---

## Expected Outcome
After these changes:
- Admin Users list will correctly show ✓ for all 165 subscribed users (vs. current 155)
- Logged-in users subscribing via widget will be properly linked
- Admin-created users will be subscribed by default (can opt-out)
- Future subscriptions will always capture `user_id` when available
