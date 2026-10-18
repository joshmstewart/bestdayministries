# BESTIE LINKING SYSTEM

## Overview
3-emoji friend codes enable secure linking between Besties and other roles. Relationships use permanent UUIDs; codes are temporary discovery tools.

## Friend Code System
- **Format:** 3 emojis from 20-emoji set = 8,000 combinations
- **Storage:** `profiles.friend_code` (TEXT, 3 chars)
- **Regeneration:** New codes don't break existing links (UUID-based)
- **Emojis:** 🌟🌈🔥🌊🌸🍕🎸🚀🏆⚡🎨🎭🎪🏰🌵🦋🐉🎯🎺🏖️

## 1. GUARDIAN ↔ BESTIE LINKING

**Table:** `caregiver_bestie_links`
- `caregiver_id`, `bestie_id`, `relationship`, approval flags, timestamps

**Flow:**
1. Guardian enters 3 emojis at `/guardian-links`
2. `find_bestie_by_friend_code` performs authenticated exact-code lookup and returns only display/avatar fields.
3. `link_bestie_by_friend_code` validates caregiver/admin authority and creates the link; both definer functions fix `search_path=public` and deny PUBLIC/anon execution.
4. Linked profile reads retain relationship policies; generic displays use `profiles_public` without email or friend codes. Code regeneration retries unique-constraint collisions rather than scanning other profiles.

**Guardian Can:**
- View/unlink besties
- Toggle approval requirements
- Manage featured posts & sponsorships

**RLS:** Caregivers CRUD their links, Besties view their links

## 2. VENDOR ↔ BESTIE LINKING

**Table:** `vendor_bestie_requests`
- `vendor_id`, `bestie_id`, `status` (pending/approved/rejected), `reviewed_by`, `message`

**Flow:**
1. Vendor submits request with 3-emoji code + optional message
2. Guardian approves/rejects at `/guardian-approvals`
3. Approved vendors can feature ONE bestie (`vendors.featured_bestie_id`)

**Vendor Can:**
- View pending/approved links
- Feature/unfeature bestie (shows in profile & marketplace)

**Guardian Can:** Approve/reject requests

**RLS:** Vendors see their requests, Guardians approve for linked besties

## 3. SPONSOR ↔ BESTIE (Financial Support)

**Table:** `sponsorships`
- `sponsor_id`, `bestie_id`, `amount`, `frequency`, `status`, `stripe_subscription_id`

**Table:** `sponsorship_shares` - Share view access with other besties

**Flow:**
1. Supporter sponsors at `/sponsor-bestie` via Stripe
2. Webhook creates `sponsorships` record (`status: 'active'`)
3. Supporter can share access via `sponsorship_shares`

**Supporter Can:**
- View/manage subscriptions at `/guardian-links`
- Cancel/modify via Stripe portal
- Share sponsorship view access

**RLS:** Sponsors/Besties view their sponsorships, shared users via `can_view_sponsorship()`

## Key Behaviors

**Friend Code Changes:**
- Existing links preserved (UUID-based)
- Only affects NEW link creation
- Like changing phone number: old contacts still have you

**Frontend Pattern:**
```tsx
{[emoji1, emoji2, emoji3].map((emoji, i) => (
  <Select value={emoji} onValueChange={setEmoji}>
    {FRIEND_CODE_EMOJIS.map(item => (
      <SelectItem value={item.emoji}>{item.emoji} {item.name}</SelectItem>
    ))}
  </Select>
))}
```

**Components:**
- `GuardianLinks.tsx` - Guardian linking
- `VendorBestieLinkRequest.tsx` - Vendor requests
- `VendorLinkRequests.tsx` - Guardian approvals
- `VendorLinkedBesties.tsx` - Vendor featured bestie

## Common Use Cases
1. **Guardian links child:** Enter code → set relationship → toggle approvals
2. **Vendor features bestie:** Request → guardian approves → vendor features
3. **Supporter sponsors:** Browse `/sponsor-bestie` → pay → share access
4. **Bestie regenerates code:** Old links stay, new code for future connections

## Troubleshooting
| Issue | Fix |
|-------|-----|
| Code not found | Verify emoji order, bestie has code |
| "Not a bestie" error | Ensure user_roles table has SELECT policy for authenticated users |
| Link exists | Check existing links first |
| Vendor stuck pending | Guardian approves at `/guardian-approvals` |

## Security Functions & RLS Requirements
```sql
is_guardian_of(_guardian_id, _bestie_id) -- Check guardian access
```

**Critical RLS Policy:**
```sql
-- user_roles table MUST have SELECT policy for authenticated users
-- Required for role verification during friend code linking
CREATE POLICY "Anyone authenticated can view user roles"
ON user_roles FOR SELECT TO authenticated USING (true);
```

## Not Implemented
- Bestie-initiated linking, link expiration, email notifications
- Rate limiting, multi-guardian support, vendor unlink
- Friend code history, approval notifications
