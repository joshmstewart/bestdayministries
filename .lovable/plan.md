
# Plan: Vendor Startup Guide (Onboarding Checklist)

## Overview

Create an interactive startup guide for new vendors that displays as a checklist with expandable details for each step. The guide will track completion state, allow manual check-off, and minimize once complete while remaining accessible for reference.

## User Experience

### Initial State (Incomplete)
- Prominent card displayed at the top of the Vendor Dashboard (above stats cards)
- Shows progress bar with completion count (e.g., "3/6 complete")
- Lists all checklist items with expand/collapse functionality
- Each item shows: checkbox, title, and brief description
- Clicking an item expands to show full details and navigation links

### Completed State
- Card collapses to a minimal "Startup Guide Complete" badge/button
- Can be clicked to re-expand and view all steps again
- Green success styling indicates completion

### Persistent State
- Completion state stored in database (`vendor_onboarding_progress` table)
- Survives browser refresh and cross-device access
- Each vendor has independent progress tracking

---

## Checklist Items

| Step | Title | Description | Details | Navigation |
|------|-------|-------------|---------|------------|
| 1 | Complete Stripe Connect | Set up payments to receive earnings | Explains Stripe Connect benefits, tax handling, payout process | → Payments tab |
| 2 | Add Your First Product | List a product in your store | Image tips, pricing strategy, inventory basics | → Products tab + Add Product button |
| 3 | Set Up Shipping | Configure shipping options and weights | Flat rate vs calculated, weight importance, free shipping threshold | → Shipping tab |
| 4 | Customize Your Store | Add branding and store description | Theme colors, business description, logo | → Settings tab |
| 5 | Link with a Bestie (Optional) | Partner with a Bestie for authentic content | How to get friend codes, benefits of linking, approval process | → Settings tab (Bestie Features) |
| 6 | View Your Public Store | Preview what customers will see | Check everything looks good, test from customer perspective | → "View My Store" button |

---

## Database Schema

```sql
CREATE TABLE vendor_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  completed_steps TEXT[] DEFAULT '{}',
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id)
);

-- RLS: Vendors can only manage their own progress
ALTER TABLE vendor_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their vendor's onboarding progress"
ON vendor_onboarding_progress
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM vendors v 
    WHERE v.id = vendor_onboarding_progress.vendor_id 
    AND v.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vendors v 
    WHERE v.id = vendor_onboarding_progress.vendor_id 
    AND v.user_id = auth.uid()
  )
);
```

---

## Component Architecture

### Files to Create

1. **`src/components/vendor/VendorStartupGuide.tsx`**
   - Main component with the collapsible checklist UI
   - Uses Accordion for expandable step details
   - Manages progress state and database sync

2. **`src/hooks/useVendorOnboardingProgress.ts`**
   - Fetches and updates progress from database
   - Provides toggle function for marking steps complete
   - Handles optimistic updates

### Component Structure

```text
VendorStartupGuide
├── Header (title, progress bar, badge)
├── Accordion
│   ├── AccordionItem (Stripe Connect)
│   │   ├── Trigger: Checkbox + Title + Brief description
│   │   └── Content: Full details + Action button
│   ├── AccordionItem (First Product)
│   │   └── ...
│   └── ... (6 total items)
└── Minimized State (when complete + dismissed)
    └── Button to re-open
```

---

## Implementation Details

### Progress Tracking Logic

```typescript
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  details: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  isOptional?: boolean;
}

const STEPS: OnboardingStep[] = [
  {
    id: 'stripe-connect',
    title: 'Complete Stripe Connect',
    description: 'Set up payments to receive earnings',
    details: (
      <div className="space-y-3">
        <p>Stripe Connect allows you to receive payments directly...</p>
        <ul className="list-disc list-inside space-y-1">
          <li>No existing Stripe account needed</li>
          <li>Automatic 1099-K tax reporting</li>
          <li>Weekly payouts to your bank</li>
        </ul>
      </div>
    ),
    action: { label: 'Go to Payments', onClick: () => setActiveTab('payments') }
  },
  // ... other steps
];
```

### Minimized State

When all non-optional steps are complete AND user dismisses the guide:
- Store `is_dismissed: true` in database
- Show compact badge: "✓ Startup Complete - View Guide"
- Clicking re-opens the full checklist

### Auto-Detection (Future Enhancement)

Could auto-detect some completions:
- Stripe Connect: Check `vendor.stripe_charges_enabled`
- First Product: Check `products` count > 0
- Store Branding: Check `vendor.description` exists

For MVP, manual checkboxes only to keep scope manageable.

---

## UI/UX Details

### Visual Design

- **Card styling**: Matches existing dashboard theme support
- **Checkbox**: Custom checkbox with smooth check animation
- **Progress bar**: Shows percentage with step count text
- **Expand indicator**: ChevronDown that rotates on open
- **Action buttons**: Primary buttons inside expanded content

### Responsive Behavior

- Mobile: Full-width, accordion still works
- Desktop: Constrained max-width for readability

### Accessibility

- Keyboard navigable (accordion is already accessible)
- ARIA labels for checkboxes
- Focus management when expanding/collapsing

---

## Integration with VendorDashboard

### Placement

```tsx
// In VendorDashboard.tsx, after vendor selector, before stats cards
{selectedVendor?.status === 'approved' && selectedVendorId && (
  <div className="space-y-6 ...">
    {/* NEW: Startup Guide */}
    <VendorStartupGuide 
      vendorId={selectedVendorId} 
      theme={theme}
      onNavigateToTab={setActiveTab}
    />
    
    {/* Existing stats cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      ...
    </div>
  </div>
)}
```

### Props

```typescript
interface VendorStartupGuideProps {
  vendorId: string;
  theme?: VendorThemePreset;
  onNavigateToTab: (tab: string) => void;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/VendorDashboard.tsx` | Import and render VendorStartupGuide component |
| **New** `src/components/vendor/VendorStartupGuide.tsx` | Main checklist component |
| **New** `src/hooks/useVendorOnboardingProgress.ts` | Database sync hook |
| **New** `supabase/migrations/...` | Create vendor_onboarding_progress table |

---

## Technical Considerations

### Performance
- Single query to load progress on mount
- Optimistic UI updates when toggling checkboxes
- No impact on dashboard loading time (async)

### Edge Cases
- New vendor with no progress record → Create on first interaction
- Multiple team members → Each sees same progress (vendor-level)
- Vendor deleted → Progress cascade deletes

### Future Enhancements (Not in MVP)
- Auto-detect completion based on actual vendor state
- Celebration animation when all complete
- Time estimates for each step
- "Need help?" links to support

