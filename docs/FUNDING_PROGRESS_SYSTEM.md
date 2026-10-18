# FUNDING PROGRESS BAR SYSTEM

**Last Updated:** 2026-10-18  
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
✅ **ALWAYS** use aggregate-only funding reads  
✅ **ALWAYS** store ending amounts in component state  
✅ **ALWAYS** use LIVE mode for public displays  

❌ **NEVER** skip `endingAmount` prop (will break visual)  
❌ **NEVER** rely on VIEW alone (doesn't split stable vs ending)  
❌ **NEVER** use local variables for render (causes TypeScript errors)  

---

## Architecture

Public reads call `get_sponsorship_funding_totals(p_bestie_ids uuid[] default null)`, a fixed-search-path SECURITY DEFINER function with explicit anon/authenticated/service execute grants. IDs are capped at 200; eligible sponsor besties are active/public, or visible to admin/linked guardian. Return fields: sponsor_bestie_id, stripe_mode, current_monthly_pledges, stable_amount, ending_amount, monthly_goal, funding_percentage, remaining_needed. Never return donor or Stripe columns.

`current_monthly_pledges` preserves the existing total: active monthly plus active unexpired/no-end one-time gifts. `stable_amount` preserves the carousel classification (monthly plus no-end/expired active one-time); `ending_amount` is active one-time with future end. GuardianLinks preserves its existing displayed total by using current minus ending as stable. The intentional legacy difference for expired still-active gifts is not changed by this privacy fix.

Both components store ending totals in state and retain LIVE filtering. Own/email, bestie/shared and admin sponsorship row policies remain. The unconditional public SELECT policy is removed. `bestie_funding_progress` now calls aggregate-only `get_featured_bestie_funding_totals()` under an invoker view, preserving its prior monthly totals. The existing by-mode funding view already calls a definer aggregate and continues to work.

```typescript
const { data: totals, error } = await supabase.rpc('get_sponsorship_funding_totals', { p_bestie_ids: bestieIds });
if (error) throw error;
setEndingAmounts(new Map((totals || []).map(t => [`${t.sponsor_bestie_id}_${t.stripe_mode}`, t.ending_amount])));
```

Donor-row queries are permitted only for existing authorized own/shared/admin workflows, never public progress calculation. Regression suite: `tests/security/sponsorship_privacy_test.py` uses live read-only requests; mint an unrelated supporter session for its authenticated test. No transaction creation/deletion is needed.

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
**Fix:** Call the aggregate RPC including ending_amount

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
- Use the shared aggregate RPC in both locations
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
1. Use get_sponsorship_funding_totals as in SponsorBestieDisplay.tsx
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
