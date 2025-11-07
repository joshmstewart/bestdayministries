# FUNDING PROGRESS BAR SYSTEM

**Last Updated:** 2025-11-07  
**Status:** ACTIVE - CRITICAL SYSTEM

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation Guide](#implementation-guide)
4. [Visual Design](#visual-design)
5. [Common Bugs to Avoid](#common-bugs-to-avoid)
6. [Testing Guide](#testing-guide)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose
The funding progress bar visualizes sponsorship funding for besties, distinguishing between:
- **Stable funding**: Monthly recurring subscriptions and expired one-time contributions (solid orange bar)
- **Ending funding**: One-time contributions that will end in the future (diagonal striped bar)

This visual distinction is **critical** because it allows guardians, administrators, and the community to see which contributions are at risk of ending.

### Key Components
- **FundingProgressBar** (`src/components/FundingProgressBar.tsx`) - The visual progress bar component
- **SponsorBestieDisplay** (`src/components/SponsorBestieDisplay.tsx`) - Public carousel display on Community page
- **GuardianLinks** (`src/pages/GuardianLinks.tsx`) - Guardian management page

### Critical Requirements
✅ **ALWAYS** pass `endingAmount` prop to `FundingProgressBar`  
✅ **ALWAYS** calculate stable and ending amounts separately  
✅ **ALWAYS** load ALL sponsorships (not just VIEW data)  
✅ **ALWAYS** store ending amounts in component state  
✅ **ALWAYS** use LIVE mode for public displays  

❌ **NEVER** skip `endingAmount` prop (will break visual)  
❌ **NEVER** rely on VIEW alone (doesn't split stable vs ending)  
❌ **NEVER** use local variables for render (causes TypeScript errors)  

---

## Architecture

### Data Flow

```
Database (sponsorships table)
    ↓
Load ALL active sponsorships with frequency, amount, ended_at
    ↓
Calculate stable amounts (monthly + expired one-time)
    ↓
Calculate ending amounts (one-time with future ended_at)
    ↓
Store in component state (Map<string, number>)
    ↓
Pass to FundingProgressBar component
    ↓
Render visual: solid bar + striped bar
```

### Database Schema

**sponsorships table:**
```sql
- sponsor_bestie_id: UUID (which bestie is sponsored)
- frequency: 'monthly' | 'one-time'
- amount: DECIMAL
- status: 'active' | 'cancelled' | 'paused'
- stripe_mode: 'live' | 'test'
- ended_at: TIMESTAMP (when one-time expires)
```

### Component Props

**FundingProgressBar:**
```typescript
interface FundingProgressBarProps {
  currentAmount: number;      // Total current funding
  goalAmount: number;          // Monthly goal
  endingAmount?: number;       // Amount ending next period
  className?: string;
}
```

---

## Implementation Guide

### Step 1: Load ALL Sponsorships

**CRITICAL:** Do NOT rely on the VIEW alone. You MUST query the sponsorships table directly.

```typescript
// Load ALL sponsorships for these besties
const { data: allBestieSponsorships, error } = await supabase
  .from("sponsorships")
  .select("sponsor_bestie_id, frequency, amount, status, stripe_mode, ended_at")
  .in("sponsor_bestie_id", bestieIds)
  .eq("status", "active");

if (error) {
  console.error("Error loading sponsorships:", error);
}

console.log("Loaded sponsorships for progress bars:", allBestieSponsorships?.length || 0, allBestieSponsorships);
```

### Step 2: Calculate Stable and Ending Amounts

```typescript
// Build maps to track stable vs ending amounts by bestie and mode
const stableAmountsByBestieAndMode = new Map<string, number>();
const endingAmountsByBestieAndMode = new Map<string, number>();

// Calculate stable and ending amounts from ALL sponsorships
(allBestieSponsorships || []).forEach(s => {
  const groupKey = `${s.sponsor_bestie_id}_${s.stripe_mode || 'null'}`;
  
  if (s.frequency === 'monthly') {
    // Monthly = stable (solid orange)
    const current = stableAmountsByBestieAndMode.get(groupKey) || 0;
    stableAmountsByBestieAndMode.set(groupKey, current + s.amount);
  } else if (s.frequency === 'one-time') {
    // One-time with future ended_at = ending (diagonal stripes)
    if (s.ended_at && new Date(s.ended_at) > new Date()) {
      const current = endingAmountsByBestieAndMode.get(groupKey) || 0;
      endingAmountsByBestieAndMode.set(groupKey, current + s.amount);
    } else {
      // One-time already expired = stable
      const current = stableAmountsByBestieAndMode.get(groupKey) || 0;
      stableAmountsByBestieAndMode.set(groupKey, current + s.amount);
    }
  }
});

console.log("Stable amounts by mode:", Object.fromEntries(stableAmountsByBestieAndMode));
console.log("Ending amounts by mode:", Object.fromEntries(endingAmountsByBestieAndMode));
```

### Step 3: Store in Component State

**CRITICAL:** Must use `useState` so the values are accessible during render.

```typescript
// In component definition
const [endingAmounts, setEndingAmounts] = useState<Map<string, number>>(new Map());

// After calculation
setEndingAmounts(endingAmountsByBestieAndMode);
```

### Step 4: Pass to FundingProgressBar

**CRITICAL:** Always pass `endingAmount` prop using the correct key format.

```tsx
<FundingProgressBar
  currentAmount={progress?.current_monthly_pledges || 0}
  goalAmount={bestie.monthly_goal}
  endingAmount={endingAmounts.get(`${bestie.id}_live`) || 0}
/>
```

**Key Format:** `${bestieId}_${stripeMode}` (e.g., `"abc123_live"`)

---

## Visual Design

### Progress Bar Structure

```
┌─────────────────────────────────────┐
│ ████████████░░░░░░░░░░░░░░          │  Progress Bar
│ ↑stable    ↑ending      ↑remaining  │
└─────────────────────────────────────┘
  Solid       Diagonal     Empty
  Orange      Stripes      Gray
```

### Color Scheme

**Stable funding (solid):**
- Color: `hsl(var(--primary))`
- Meaning: Monthly subscriptions + expired one-time
- Reliable, ongoing support

**Ending funding (stripes):**
- Pattern: `repeating-linear-gradient(45deg, burnt-orange, accent)`
- Meaning: One-time contributions ending in the future
- At-risk funding that needs attention

**Text indicators:**
- Total pledged: Default text color
- Ending amount: Yellow text `(e.g., "$300.00 ending")`
- Goal reached: Green text with checkmark

### Edge Case Displays

**No ending amount (endingAmount = 0):**
```
┌─────────────────────────────────────┐
│ ████████████████████████            │
└─────────────────────────────────────┘
  All solid orange (stable only)
```

**Fully ending (all one-time):**
```
┌─────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░          │
└─────────────────────────────────────┘
  All diagonal stripes (high risk!)
```

**Mixed (monthly + one-time):**
```
┌─────────────────────────────────────┐
│ ████████████░░░░░░░░░░░░            │
└─────────────────────────────────────┘
  Solid then stripes (normal case)
```

---

## Common Bugs to Avoid

### Bug #1: Not Passing endingAmount Prop
**Symptom:** Progress bar always shows solid orange, never stripes  
**Cause:** `endingAmount` prop missing or always 0  
**Fix:** Always pass `endingAmount={endingAmounts.get(...) || 0}`

### Bug #2: Relying on VIEW Only
**Symptom:** Cannot calculate ending amount correctly  
**Cause:** VIEW only shows totals, not frequency breakdown  
**Fix:** Query sponsorships table directly with frequency and ended_at

### Bug #3: Local Variable Instead of State
**Symptom:** TypeScript error "Cannot find name 'endingAmountsByBestieAndMode'"  
**Cause:** Using local variable in async function, not accessible in render  
**Fix:** Use `useState` and `setEndingAmounts`

### Bug #4: Wrong Key Format
**Symptom:** Always returns undefined, never finds ending amount  
**Cause:** Key format doesn't match (e.g., missing stripe_mode)  
**Fix:** Use exact format `${bestie.id}_live`

### Bug #5: Using TEST Mode on Public Pages
**Symptom:** Public pages show test data instead of real funding  
**Cause:** Not hardcoding `stripe_mode='live'` for public displays  
**Fix:** Always filter `.eq('stripe_mode', 'live')` on public pages

---

## Testing Guide

### Manual Testing Checklist

**Setup:**
1. Create a bestie with monthly_goal > 0
2. Create monthly sponsorship ($50)
3. Create one-time sponsorship with future ended_at ($300)

**Expected Results:**
- [ ] Solid orange bar shows $50 (monthly)
- [ ] Diagonal striped bar shows $300 (one-time)
- [ ] Total shows $350 pledged
- [ ] Yellow text shows "($300.00 ending)"
- [ ] Same display on GuardianLinks page and Community carousel

**Edge Cases:**
- [ ] No ending amount → all solid orange
- [ ] All ending → all diagonal stripes
- [ ] Expired one-time → shows as solid (stable)
- [ ] Goal exceeded → capped at 100%

### Automated Testing

See `tests/e2e/sponsorship.spec.ts` for E2E tests covering:
- Progress bar rendering
- Ending amount calculations
- Visual stripe display
- Cross-page consistency

### Debugging Tools

**Console logs to add:**
```typescript
console.log("Loaded sponsorships for progress bars:", allBestieSponsorships?.length, allBestieSponsorships);
console.log("Stable amounts by mode:", Object.fromEntries(stableAmountsByBestieAndMode));
console.log("Ending amounts by mode:", Object.fromEntries(endingAmountsByBestieAndMode));
```

**What to check:**
1. Sponsorships array length matches expected count
2. Stable amounts grouped correctly by bestie_id and mode
3. Ending amounts only include one-time with future ended_at
4. Key format matches render pattern

---

## Troubleshooting

### Problem: Stripes Never Show

**Diagnosis:**
1. Check browser console for "Ending amounts by mode" log
2. Verify ending amounts are calculated (Map not empty)
3. Check `endingAmount` prop is passed to component
4. Inspect element - look for diagonal gradient CSS

**Solutions:**
- Add missing `endingAmount={endingAmounts.get(...) || 0}` prop
- Verify `setEndingAmounts()` is called after calculation
- Check one-time sponsorships have future `ended_at` dates

### Problem: Wrong Amounts Displayed

**Diagnosis:**
1. Check "Loaded sponsorships" log - verify all sponsorships present
2. Check "Stable amounts" log - verify grouping is correct
3. Verify `stripe_mode` filter matches display context (live vs test)
4. Check ended_at dates are in the future

**Solutions:**
- Query with correct `stripe_mode` filter
- Verify bestie IDs match between query and render
- Check date comparison logic (future vs expired)

### Problem: Different Display Across Pages

**Diagnosis:**
1. Compare console logs between pages
2. Verify both pages use same calculation pattern
3. Check both pages use same stripe_mode filter

**Solutions:**
- Copy exact calculation code to both locations
- Document pattern in MASTER_SYSTEM_DOCS
- Add integration tests to catch divergence

---

## Related Documentation

- `MASTER_SYSTEM_DOCS.md` - SPONSORSHIP section, FUNDING-PROGRESS-SYSTEM
- `SPONSORSHIP_RECEIPT_SYSTEM_COMPLETE.md` - Full sponsorship system overview
- `EDGE_FUNCTIONS_REFERENCE.md` - Sponsorship-related edge functions

---

## Maintenance Notes

**When adding new pages with funding progress:**
1. Copy calculation pattern from SponsorBestieDisplay.tsx
2. Use `useState<Map<string, number>>` for ending amounts
3. Always pass endingAmount prop
4. Add console.log debugging
5. Test with one-time sponsorships
6. Update this documentation

**When modifying sponsorships table:**
1. Verify frequency field still exists
2. Verify ended_at field still exists
3. Update VIEW if needed
4. Re-test progress bar calculations
5. Update schema documentation here

---

## Version History

**2025-11-07:** Initial documentation created
- Documented stable vs ending calculation pattern
- Added comprehensive implementation guide
- Documented common bugs and solutions
- Added testing and troubleshooting guides
