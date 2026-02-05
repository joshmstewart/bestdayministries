
# Campaign Archive Feature

## Summary
Add the ability to archive newsletter campaigns to keep your list clean while preserving test campaigns for reference. Archived campaigns will be hidden by default but can be viewed with a toggle.

## What You'll Get
- **Archive Button**: One-click archive on any sent campaign
- **Hidden by Default**: Archived campaigns won't clutter your main list
- **Show Archived Toggle**: Switch to view archived campaigns when needed
- **Unarchive Option**: Restore archived campaigns back to the main list
- **Visual Indicator**: Distinct gray badge for archived status

---

## Technical Implementation

### 1. Database Changes

**Add `archived` to the status enum:**

```sql
ALTER TYPE newsletter_campaign_status ADD VALUE 'archived';
```

This extends the existing enum (`draft`, `scheduled`, `sending`, `sent`, `failed`) to include `archived`.

### 2. Component Updates

**NewsletterCampaigns.tsx:**

| Change | Description |
|--------|-------------|
| Add toggle state | `showArchived` boolean (default: false) |
| Filter campaigns | Exclude archived from list unless toggle is on |
| Add toggle UI | Switch component next to "New Campaign" button |
| Add Archive button | Shows on `sent` campaigns (next to View Stats) |
| Add Unarchive button | Shows on `archived` campaigns |
| Update badge styling | Gray/muted color for `archived` status |

**Visual Layout:**

```text
┌─────────────────────────────────────────────────────────────┐
│  Email Campaigns          [Show Archived ○]  [+ New Campaign]│
├─────────────────────────────────────────────────────────────┤
│  Newsletter Feb 26 FINAL   [sending]                         │
│  Created Feb 4, 2026 • Sending: 298/1389                    │
│  [👁] [📋] [📄] [✉] [▶ Resume]                               │
├─────────────────────────────────────────────────────────────┤
│  Newsletter Feb 26 (Copy)   [sent]                           │
│  Created Feb 4, 2026 • 3 recipients                         │
│  [👁] [View Stats] [📋] [📄] [📥 Archive]                    │
└─────────────────────────────────────────────────────────────┘
```

When "Show Archived" is enabled:

```text
┌─────────────────────────────────────────────────────────────┐
│  Test Campaign v1   [archived]                               │
│  Created Feb 1, 2026 • 5 recipients                         │
│  [👁] [View Stats] [📋] [📦 Unarchive]                       │
└─────────────────────────────────────────────────────────────┘
```

### 3. Archive Mutation

```typescript
const archiveCampaignMutation = useMutation({
  mutationFn: async (campaignId: string) => {
    const { error } = await supabase
      .from("newsletter_campaigns")
      .update({ status: "archived" })
      .eq("id", campaignId);
    if (error) throw error;
  },
  onSuccess: () => {
    toast.success("Campaign archived");
    queryClient.invalidateQueries({ queryKey: ["newsletter-campaigns"] });
  },
});
```

### 4. Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/newsletter/NewsletterCampaigns.tsx` | Add toggle, filter logic, archive/unarchive buttons |
| Database migration | Add `archived` to enum |

### 5. Behavior Details

- **Which campaigns can be archived?** Only `sent` and `failed` campaigns
- **Can drafts be archived?** No - delete them instead (already exists)
- **What happens to analytics?** Preserved - archived campaigns keep their stats
- **Can you clone an archived campaign?** Yes - useful for recreating tests

### 6. Edge Cases Handled

- Archived campaigns excluded from analytics totals (already filtered by `status='sent'`)
- Clone button works on archived campaigns (creates new draft)
- Toggle state persists during session (useState)
