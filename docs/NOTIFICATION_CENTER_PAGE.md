# NOTIFICATION CENTER PAGE - DOCUMENTATION

## Overview
Full-page notification center at `/notifications` with advanced filtering, search, bulk actions, and better organization than the dropdown bell.

## Location & Access
**Route:** `/notifications`
**Access:** Authenticated users only (all roles)
**Link From:** NotificationBell dropdown → "View All Notifications" button

## Key Features

### 1. Advanced Filtering
**Search Bar:**
- Searches title + message text
- Real-time filtering as user types
- Icon: Search (left side of input)

**Type Filter:**
- Dropdown with notification types
- Options: All, Approvals, Moderation, Comments, Messages, Vendors, Updates
- Icon: Filter

**Date Filter:**
- Dropdown with time ranges
- Options: All Time, Today, Last 7 Days, Last 30 Days
- Icon: Calendar

### 2. Bulk Actions
**Mark All as Read:**
- Shows unread count in button
- Triggers `markAllAsRead()` from hook
- Only visible when unread notifications exist

**Clear Read:**
- Shows read count in button
- Triggers `deleteAllRead()` from hook
- Only visible when read notifications exist

### 3. Tab Organization
**Three Tabs:**
- **Unread:** Shows only unread notifications
- **Read:** Shows only read notifications
- **All:** Shows all filtered notifications

**Tab Badges:** Display count of notifications in each tab

### 4. Enhanced Notification Cards
**Display:**
- Bell icon (primary background if unread, muted if read)
- Title (bold)
- Message text
- Timestamp (relative: "2 hours ago")
- Type badge (e.g., "Approvals", "Messages")
- Resolved badge (green, for auto-resolved)
- Unread indicator (blue dot)

**Styling:**
- Unread: `bg-primary/5 border-primary/20`
- Auto-resolved: `opacity-75 bg-muted/20`
- Hover: Shadow effect + delete button appears

**Actions:**
- Click card → Navigate to link + mark as read
- Hover → Delete button (X) appears in top-right
- Delete → Removes notification

### 5. Empty States
**No Unread:** Bell icon + "No unread notifications"
**No Read:** Bell icon + "No read notifications"
**No Results:** Bell icon + "No notifications match your filters" (if filters active) or "No notifications yet"

## Component Structure

```tsx
<main className="flex-1 pt-24">
  <Container max-w-4xl>
    <BackButton />
    <Header />
    <Filters>
      <SearchBar />
      <TypeFilter />
      <DateFilter />
    </Filters>
    <BulkActions>
      <MarkAllAsRead />
      <ClearRead />
    </BulkActions>
    <Tabs defaultValue="unread">
      <TabsList>Unread | Read | All</TabsList>
      <TabsContent>
        {notifications.map(NotificationCard)}
      </TabsContent>
    </Tabs>
  </Container>
</main>
```

## Data Flow

### Hook: `useNotifications()`
**Returns:**
- `notifications` - Array of all notifications
- `loading` - Loading state
- `markAllAsRead()` - Mark all as read
- `deleteNotification(id)` - Delete single notification
- `deleteAllRead()` - Delete all read notifications
- `handleNotificationClick(notification)` - Navigate + mark as read

### Filtering Logic
1. **Search:** `title.includes(query) || message.includes(query)`
2. **Type:** `type === selectedType` (or all)
3. **Date:** Calculate `daysDiff` from `created_at`:
   - Today: `daysDiff === 0`
   - Week: `daysDiff <= 7`
   - Month: `daysDiff <= 30`

## Notification Types Map
```typescript
{
  all: "All",
  pending_approval: "Approvals",
  moderation_needed: "Moderation",
  comment_on_post: "Comments",
  new_sponsor_message: "Messages",
  vendor_application: "Vendors",
  product_update: "Updates",
}
```

## Mobile Responsiveness
- Filters stack vertically on small screens (`flex-col sm:flex-row`)
- Tabs grid layout adjusts automatically
- Search bar full width on mobile
- Max width: `max-w-[90vw]` on mobile

## Integration Points

### NotificationBell Component
**Changes:**
- Added "View All Notifications" button at bottom of dropdown
- Button navigates to `/notifications` route
- Border-top separator above button
- Icon: ArrowRight (right side)

### App.tsx
**Route:** `<Route path="/notifications" element={<Notifications />} />`

### Internal Pages Registry
**Added:** `{ value: "/notifications", label: "Notifications" }`

## User Workflows

### View All Notifications
1. Click bell in header
2. Click "View All Notifications" at bottom
3. Lands on full-page notification center

### Filter Notifications
1. Use search bar for text search
2. Select type from dropdown (Approvals, Messages, etc.)
3. Select date range from dropdown
4. Results update immediately

### Bulk Management
1. View unread notifications in "Unread" tab
2. Click "Mark all as read" → All become read
3. Switch to "Read" tab
4. Click "Clear read" → All read notifications deleted

### Individual Actions
1. Click notification card → Navigate to linked page + mark as read
2. Hover over card → Delete button appears
3. Click delete → Notification removed

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Filters not working | State not updating | Check filter logic in `filteredNotifications` |
| Empty state shows with notifications | Filter too restrictive | Reset filters to "All" |
| Back button doesn't work | Missing navigation setup | Verify `useNavigate()` hook |
| Tabs show wrong counts | Filtering happens before split | Check order: filter → split → count |
| Search case-sensitive | Missing `.toLowerCase()` | Apply to both query and text |

## Future Enhancements
- [ ] Pagination (currently shows all)
- [ ] Export notifications (CSV/JSON)
- [ ] Snooze functionality
- [ ] Custom notification preferences per type
- [ ] Rich notifications (images, attachments)
- [ ] Notification categories/tags
- [ ] Advanced date picker (custom range)
- [ ] Keyboard shortcuts (mark all, delete, navigate)

## Performance Considerations
- All notifications loaded at once (no pagination yet)
- Filtering happens client-side (fast for <1000 notifications)
- Real-time subscriptions still active via `useNotifications` hook
- Consider adding virtual scrolling if >500 notifications

---

**Files:**
- `src/pages/Notifications.tsx` - Main page
- `src/components/NotificationBell.tsx` - Bell with "View All" link
- `src/hooks/useNotifications.ts` - Data hook
- `src/App.tsx` - Route definition
- `src/lib/internalPages.ts` - Registry entry
