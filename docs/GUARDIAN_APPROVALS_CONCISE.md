GUARDIAN APPROVALS

Central hub (`/guardian-approvals`) for caregivers to approve/reject content from linked besties. Caregiver role only.

## Tabs

**Posts:** `discussion_posts` (pending_approval) → Approve/Reject/Delete
**Comments:** `discussion_comments` (pending_approval) → Approve/Reject  
**Vendors:** `vendor_bestie_requests` (pending) → Approve/Reject
**Messages:** `sponsor_messages` (pending_approval) → Approve As-Is | Edit & Approve (subject/text/image/video) | Reject

## Features

**Approval Flags:** `caregiver_bestie_links` controls `require_post_approval`, `require_comment_approval`, `require_message_approval`, `require_vendor_asset_approval`

**Badge Count:** `useGuardianApprovalsCount` hook sums pending across all 4 tables, updates realtime

**Message Editing:** Subject/text edit, image crop/recrop, video upload, sets `from_guardian = true`

**RLS:** `is_guardian_of(guardian_id, bestie_id)` grants UPDATE on posts/comments/vendor_requests/messages

**Files:** `GuardianApprovals.tsx`, `VendorLinkRequests.tsx`, `BestieSponsorMessages.tsx`, `useGuardianApprovalsCount.ts`
