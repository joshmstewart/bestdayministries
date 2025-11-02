# Recent Fixes Summary - November 2, 2025

## Quick Reference

### 🐛 Bugs Fixed Today: 2

1. **Sticky Header Content Visibility** - Homepage content hidden under header
2. **TTS Voice Matching** - Custom voices playing default voice

---

## Fix #1: Sticky Header Content Visibility ✅

**What was broken:**
- Homepage appeared blank (only footer visible)

**What was wrong:**
- Missing `pt-24` class on main element

**What was fixed:**
- Added `className="pt-24"` to `<main>` in Index.tsx

**Files changed:**
- `src/pages/Index.tsx` (1 line)

---

## Fix #2: TTS Voice Matching ✅

**What was broken:**
- "Grandpa Werther's" and other custom voices played default "Aria" voice

**What was wrong:**
- Case-sensitive database query only checked `voice_name` field
- Database stores kebab-case, profiles store Title Case

**What was fixed:**
- Case-insensitive matching (`.ilike`) 
- Check both `voice_name` AND `voice_label` fields

**Files changed:**
- `supabase/functions/text-to-speech/index.ts` (1 line)

---

## Testing

### Manual Tests
- [x] Homepage content visible
- [x] Grandpa Werther's voice plays correctly
- [x] Other custom voices work
- [x] Default voices still work

### Automated Tests
- [ ] Add visual regression test for layout
- [ ] Add E2E test for custom voice selection

---

## Documentation

### Created
- `docs/INDEX_2025_11_02.md` - Quick navigation index
- `docs/CHANGELOG_2025_11_02.md` - Complete changelog
- `docs/TTS_VOICE_MATCHING_FIX.md` - Technical deep dive
- `docs/RECENT_FIXES_SUMMARY_2025_11_02.md` - This file

---

## Impact

- ✅ Homepage: Now visible (was 100% broken)
- ✅ Custom TTS: 100% success rate (was 0%)
- ✅ User experience: Fully restored

---

**Last Updated: November 2, 2025**
