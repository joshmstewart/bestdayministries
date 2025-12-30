# Changelog - January 15, 2025

## Contact Form Email System Enhancements

### Multi-Recipient Admin Notifications
**Edge Function:** `notify-admin-new-contact`

**Change:** Admin notifications for new contact form submissions now go to ALL admin/owner users, not just the email configured in contact_form_settings.

**Implementation:**
1. Fetches `recipient_email` from `contact_form_settings` table
2. Queries `user_roles` table for all users with 'admin' or 'owner' role
3. Fetches email addresses from `profiles` table for those users
4. Deduplicates all emails and sends a single notification to all recipients
5. Falls back to `ADMIN_EMAIL` env var if no recipients found

**Benefits:**
- All admins receive contact form notifications
- No need to manually configure each admin's email
- Settings email still works as a fallback/additional recipient
- Single email sent (not one per admin) to avoid spam

### Original Sender Extraction for Inbound Emails
**Edge Function:** `process-inbound-email`

**Problem:** Cloudflare Email Routing can rewrite the `from` field to a forwarding address (e.g., `abc123@send.bestdayministries.org`), causing admin notifications to show incorrect sender information.

**Solution:** Added `extractOriginalSender()` function that parses raw email headers to find the true sender.

**Header Priority:**
1. `Reply-To:` header (highest priority)
2. `From:` header
3. `X-Original-From:` header (fallback)

**Format Support:**
- `"Name" <email@domain.com>`
- `Name <email@domain.com>`
- `email@domain.com`

**Implementation:**
```typescript
function extractOriginalSender(raw: string): { email: string; name: string } | null {
  // Parses raw email content for original sender headers
  // Returns email and name separately
  // Returns null if no valid email found
}
```

**Benefits:**
- Admin notifications show actual sender name and email
- Works with Cloudflare's email rewriting
- Maintains backward compatibility if headers unavailable

## Files Modified

### Edge Functions
- `supabase/functions/notify-admin-new-contact/index.ts` - Multi-recipient support
- `supabase/functions/process-inbound-email/index.ts` - Original sender extraction

### Documentation Updated
- `docs/CONTACT_FORM_SYSTEM.md` - Added multi-recipient documentation
- `docs/CONTACT_FORM_NOTIFICATIONS.md` - Added admin email notification section
- `docs/EMAIL_SYSTEM_MASTER.md` - Updated process-inbound-email and notify-admin-new-contact docs
- `docs/EDGE_FUNCTIONS_REFERENCE.md` - Updated function descriptions
- `docs/MASTER_SYSTEM_DOCS.md` - Added new patterns to CONTACT_FORM section

## Testing
1. Submit contact form → Verify all admins receive notification
2. Reply via email (with Cloudflare routing) → Verify correct sender shown in admin notification
3. Check email_audit_log → Verify all recipients logged
