# NOTIFICATION BADGE LOCATIONS

## 1. UnifiedHeader (Top Nav)

**Notification Bell** (All authenticated users)
- Count: Unread in-app notifications
- Hook: `useNotifications`
- Badge: Red, top-right of bell icon
- Shows "9+" if count > 9
- Location: Before profile dropdown menu
- **Auto-Dismiss:** Notifications automatically marked as read when underlying action is completed (e.g., approve a post)
- **Resolved Badge:** Auto-dismissed notifications show "✓ Resolved" badge and stay in history
- **Styling:** Resolved notifications have grayed-out styling (75% opacity)

**Approvals Button** (Caregivers only)
- Count: Pending posts + comments + vendor link requests
- Hook: `useGuardianApprovalsCount`
- Badge: Red, top-right of "Approvals" button

**Admin Button** (Admins only)
- Count: Unmoderated posts/comments + pending vendor applications
- Aggregation: `moderationCount + pendingVendorsCount`
- Badge: Red, top-right of "Admin" button

## 2. Admin Dashboard

**Vendors Tab**
- Count: Vendors with "pending" status
- Hook: `usePendingVendorsCount`
- Badge: Red, next to tab label

**Moderation Tab**
- Count: Unmoderated posts + comments
- Hook: `useModerationCount`
- Badge: Red, next to tab label

## 3. Guardian Approvals Page

**Posts Tab**
- Count: `pendingPosts.length`
- Badge: Red/destructive

**Comments Tab**
- Count: `pendingComments.length`
- Badge: Red/destructive

**Vendor Links Tab**
- Count: `pendingVendorLinks`
- Badge: Red/destructive

## 4. Inventory Status Badges (Not Notification Badges)

**Admin Vendor Management**
- Red badge when `inventory_count <= 10`

**Marketplace Product Cards**
- "Out of Stock" badge when `inventory_count === 0`

**Vendor Product List**
- "Out of Stock" badge when `inventory_count === 0`

## Key Features
- All use red "destructive" variant
- Realtime subscriptions with separate INSERT, UPDATE, DELETE event listeners for immediate updates
- Deleted notifications/submissions instantly update badge counts
- Header badges aggregate multiple sources
- **Auto-resolve system:** Database triggers automatically mark notifications as read when actions complete
- **Visual history:** Resolved notifications remain visible with "✓ Resolved" badge

## Realtime Implementation
**Pattern:** Separate event listeners instead of wildcard ('*')
```typescript
// Example from useNotifications:
.on('postgres_changes', { event: 'INSERT', ... }, reload)
.on('postgres_changes', { event: 'UPDATE', ... }, reload)
.on('postgres_changes', { event: 'DELETE', ... }, reload)
```

**Benefits:**
- Immediate badge updates when notifications deleted
- Fine-grained control over event handling
- Better debugging (specific event logs)
- Consistent across all badge hooks

## Auto-Resolve System

**Database Triggers:**
- `discussion_posts`: Approved → marks `moderation_needed` and `pending_approval` notifications as resolved
- `discussion_comments`: Approved → marks related notifications as resolved
- `sponsor_messages`: Approved → marks `new_sponsor_message` notifications as resolved
- `vendors`: Approved → marks `vendor_application` notifications as resolved
- `vendor_bestie_requests`: Approved/Rejected → marks related notifications as resolved

**User Experience:**
- Complete action elsewhere (e.g., approve post at `/guardian-approvals`)
- Notification automatically marked as read
- Shows "✓ Resolved" badge in notification list
- Styled with 75% opacity and grayed background
- Stays in notification history for reference
- Can still be manually deleted
