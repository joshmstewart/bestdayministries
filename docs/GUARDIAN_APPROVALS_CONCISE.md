GUARDIAN APPROVALS - CONCISE

## Overview
Central hub (`/guardian-approvals`) for caregivers to approve/reject content from linked besties.

**Access:** Caregivers only (role from `user_roles`)

## Tabs & Sources

### 1. Posts
**Source:** `discussion_posts` where `approval_status = 'pending_approval'` AND author is linked bestie
**Actions:** Approve (`approved` + `is_moderated = true`), Reject (`rejected`), Delete

### 2. Comments
**Source:** `discussion_comments` where `approval_status = 'pending_approval'` AND author is linked bestie
**Actions:** Approve, Reject

### 3. Vendors
**Component:** `VendorLinkRequests`
**Source:** `vendor_bestie_requests` where `status = 'pending'` AND bestie is linked
**Actions:** Approve (`status = 'approved'`), Reject (`rejected`)

### 4. Messages
**Component:** `BestieSponsorMessages`
**Source:** `sponsor_messages` where `status = 'pending_approval'` AND bestie is linked
**Actions:**
- **Approve As-Is:** Sets `status = 'approved'`
- **Edit & Approve:** Dialog for editing subject, message, add/recrop image → saves with `from_guardian = true`
- **Reject:** Provide rejection reason

## Approval Requirements
Controlled by `caregiver_bestie_links` table:
- `require_post_approval` - Posts need approval
- `require_comment_approval` - Comments need approval
- `require_message_approval` - Messages need approval (default: true)
- `require_vendor_asset_approval` - Vendor assets need approval

## Badge Count (Header)
**Hook:** `useGuardianApprovalsCount`
**Calculation:** Sum of pending posts + comments + vendor links + messages
**Updates:** Realtime via subscriptions to all 4 tables

## Message Editing Dialog
- Edit subject, message text
- Add/crop image (`app-assets/sponsor-messages/`)
- Recrop existing image with AspectRatio selector
- Preview before save

## RLS Policies
Uses `is_guardian_of(guardian_id, bestie_id)` function for UPDATE access on:
- `discussion_posts`
- `discussion_comments`
- `vendor_bestie_requests`
- `sponsor_messages`

## Common Issues
| Issue | Fix |
|-------|-----|
| Nothing showing | Check linked besties exist |
| Count doesn't update | Verify realtime subscription cleanup |
| Can't approve | Check `is_guardian_of()` RLS function |

**Files:** `GuardianApprovals.tsx`, `VendorLinkRequests.tsx`, `BestieSponsorMessages.tsx`, `useGuardianApprovalsCount.ts`
