# GUARDIAN APPROVALS - CONCISE DOCS

## Overview
Central hub (`/guardian-approvals`) for guardians to approve/reject content and requests from linked besties.

## Access Control
**Who:** Caregivers only (role from `user_roles` table)
**Redirect:** Non-caregivers sent to `/community`

## Approval Categories (Tabs)

### 1. Posts Tab
**Source:** `discussion_posts` where `approval_status = 'pending_approval'`
**Filter:** Posts from guardian's linked besties only
```sql
SELECT * FROM discussion_posts
WHERE approval_status = 'pending_approval'
  AND author_id IN (
    SELECT bestie_id FROM caregiver_bestie_links
    WHERE caregiver_id = current_user
  )
```

**Display:**
- Card with author avatar, name, title, content
- Image preview if attached
- Video/album link if attached
- Approve/Reject buttons

**Actions:**
- **Approve:** Sets `approval_status = 'approved'`, `is_moderated = true`
- **Reject:** Sets `approval_status = 'rejected'` (not visible on feed)
- **Delete:** Deletes post entirely

### 2. Comments Tab
**Source:** `discussion_comments` where `approval_status = 'pending_approval'`
**Filter:** Comments from guardian's linked besties
```sql
SELECT c.*, p.title as post_title
FROM discussion_comments c
JOIN discussion_posts p ON c.post_id = p.id
WHERE c.approval_status = 'pending_approval'
  AND c.author_id IN (linked besties)
```

**Display:**
- Card with author info, post title
- Comment text OR audio player
- Approve/Reject buttons

**Actions:**
- **Approve:** Sets `approval_status = 'approved'`, `is_moderated = true`
- **Reject:** Sets `approval_status = 'rejected'`

### 3. Vendors Tab
**Component:** `VendorLinkRequests`
**Source:** `vendor_bestie_requests` where `status = 'pending'`
**Filter:** Requests for guardian's linked besties

**Display:**
- Vendor business name, message
- Bestie name
- Request date
- Approve/Reject buttons

**Actions:**
- **Approve:** `status = 'approved'` → vendor can feature bestie
- **Reject:** `status = 'rejected'` → vendor notified

### 4. Messages Tab
**Component:** `BestieSponsorMessages`
**Source:** `sponsor_messages` where `status = 'pending_approval'`
**Filter:** Messages from guardian's linked besties

**Display:**
- Bestie name, subject, message content
- Audio player if voice message
- Image/video preview if attached
- Edit & Approve / Reject buttons

**Actions:**
- **Approve As-Is:** `status = 'approved'` → sent to sponsors
- **Edit & Approve:** Opens dialog:
  - Edit subject, message text
  - Add/crop image
  - Recrop existing image
  - On save: `status = 'approved'`, `from_guardian = true`
- **Reject:** `status = 'rejected'`, provide rejection reason

## Approval Requirements (Guardian Link Settings)

### Post Approval
- Controlled by `caregiver_bestie_links.require_post_approval`
- If `true`: Bestie posts → `pending_approval`
- If `false`: Bestie posts → auto-approved

### Comment Approval
- Controlled by `caregiver_bestie_links.require_comment_approval`
- If `true`: Bestie comments → `pending_approval`
- If `false`: Bestie comments → auto-approved

### Message Approval
- Controlled by `caregiver_bestie_links.require_message_approval`
- Default: `true` (always requires approval)
- Guardian can disable in link settings

### Vendor Asset Approval
- Controlled by `caregiver_bestie_links.require_vendor_asset_approval`
- Separate from post approval
- For vendor store displays

## Badge Counts (Header)
**Location:** UnifiedHeader "Approvals" button
**Hook:** `useGuardianApprovalsCount`
**Calculation:**
```typescript
pendingPosts.length + 
pendingComments.length + 
pendingVendorLinks + 
pendingMessages
```

**Realtime:** Subscribes to all 4 tables, updates live

## Message Editing Dialog

### Edit Features
1. **Subject:** Text input, editable
2. **Message:** Textarea, editable
3. **Image:** 
   - Add new image (with crop dialog)
   - Recrop existing image (AspectRatio selector)
   - Preview before save
4. **Video:** Preview only (not editable)

### Save Behavior
- Updates `sponsor_messages` record
- Sets `from_guardian = true` (indicator for sponsors)
- Sets `status = 'approved'`
- Uploads new image to `app-assets/sponsor-messages/` if added

## RLS Policies
**discussion_posts UPDATE:**
- Guardians can approve posts from linked besties
- Uses `is_guardian_of()` function

**discussion_comments UPDATE:**
- Same guardian check as posts

**vendor_bestie_requests UPDATE:**
- Guardians approve for their besties

**sponsor_messages UPDATE:**
- Guardians approve/edit for their besties

## Notification Flow
1. Bestie creates content → `approval_status = 'pending_approval'`
2. Guardian sees badge count increase (realtime)
3. Guardian opens `/guardian-approvals`, sees pending items
4. Guardian approves/rejects
5. Bestie notified of status change (future: toast/email)
6. If approved: Content visible to public
7. If rejected: Content hidden, reason shown to bestie

## Empty States
**No Linked Besties:**
```tsx
"You haven't linked any besties yet. Go to Guardian Links to get started."
```

**No Pending Items:**
```tsx
"No pending {posts/comments/requests} at this time."
```

## Key Files
- `src/pages/GuardianApprovals.tsx` - Main page
- `src/components/guardian/VendorLinkRequests.tsx` - Vendor tab
- `src/components/guardian/BestieSponsorMessages.tsx` - Messages tab
- `src/hooks/useGuardianApprovalsCount.ts` - Badge count

## Common Issues
| Issue | Solution |
|-------|----------|
| Nothing showing | Check if guardian has linked besties |
| Count doesn't update | Verify realtime subscription cleanup |
| Can't approve | Check `is_guardian_of()` RLS function |
| Edit dialog won't save | Verify image crop completed |
| Badge shows wrong count | Check subscription filters match tab queries |

## Future Enhancements
- Bulk approve/reject
- Approval history log
- Email notifications
- In-app notifications
- Rejection reason editor
- Featured post approval separate tab
