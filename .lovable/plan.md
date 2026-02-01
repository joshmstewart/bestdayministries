
Goal
- Make the reward wheel have perfect visual symmetry: every other slice is a sticker pack slice (i.e., coin, pack, coin, pack… all the way around).
- Eliminate the current “I fixed one and broke another” behavior by removing the fragile “probability → slice counts → interleave → patch” approach that can still produce streaks.

What’s actually going wrong (root cause)
- In `src/components/chores/SpinningWheel.tsx`, the wheel currently tries to:
  1) Convert probabilities into 16 slice counts via rounding.
  2) Split slices into `coinSlices` and `packSlices`.
  3) Interleave them.
- That interleaving is not guaranteed to alternate because the computed counts can be unbalanced (e.g., 9 coin slices vs 7 pack slices). When one list runs out, it appends the remainder from the other list, creating adjacent coins (and with wrap-around, it can create “3 10s in a row”).
- The recent `breakUpTenRunsCircular` patch only targets long runs of “10 coins”, not the actual requirement (strict alternation), so it can “fix” one run while causing a new undesirable arrangement elsewhere.

Your current wheel config confirms why this happens
- Your `chore_wheel_config` “balanced” preset has 8 segments alternating coin/pack already, but the code ignores that order and rebuilds a 16-slice layout from probabilities, which can produce 9 coins / 7 packs and then streaks.

Solution design (simple + deterministic)
- Stop deriving the visual layout from probabilities.
- Build the 16 visible slices with a deterministic alternating pattern:
  - Slice indices 0,2,4,… (even) are coins
  - Slice indices 1,3,5,… (odd) are packs
- Choose which coin/pack goes in each slot by cycling through the configured coin segments and pack segments in their existing order (round-robin).
  - This preserves your intended “10, pack, 10, pack…” feel, and guarantees every other slice is a pack.
  - It also guarantees every segment still appears (and uses the same object references, so the current equality check `slice.segment === winningSegment` keeps working).

Planned code changes (implementation steps)
1) Read/confirm existing patterns
   - Re-check `SpinningWheel.tsx` and `ChoreRewardWheelDialog.tsx` to ensure the spin outcome is chosen by probability (it is: `selectSegment()` uses `segment.probability`), and the slices are only for where the spinner lands visually.
2) Replace the expanded slice builder in `SpinningWheel.tsx`
   - Remove (or bypass) the whole block that:
     - computes `rawCounts` / `sliceCounts`
     - generates `coinSlices` / `packSlices`
     - interleaves them
     - runs `breakUpTenRunsCircular`
   - Replace it with a new layout builder that:
     - `coinSource = segments.filter(s => s.type === 'coins')`
     - `packSource = segments.filter(s => s.type === 'sticker_pack')`
     - If either source is empty: fallback to a simple repeat of `segments` to reach 16 (no alternation possible).
     - Else generate `arranged[16]`:
       - for i=0..15:
         - if i even: `arranged[i] = coinSource[coinIdx % coinSource.length]; coinIdx++`
         - if i odd:  `arranged[i] = packSource[packIdx % packSource.length]; packIdx++`
     - Build `spreadSlices` from `arranged` with equal angles.
3) Keep probabilities exactly as-is for outcomes
   - Do not change `selectSegment()` (so your configured probabilities remain the source of truth for what you win).
   - This is important: you get perfect visual symmetry without changing the reward distribution.
4) Optional: add a dev-only console log for sanity
   - Log the final 16-slice sequence (types + labels) to quickly verify it’s alternating and stable.
5) Verify no other code depends on the old slice-count logic
   - Confirm `generateSegments()` and SVG rendering use only `expandedSlices.slices` and do not depend on remainders/counts logic.
   - Confirm `spin()` always finds matching slices for the winning segment (it will, because every segment is cycled into the wheel).

Testing checklist (what you should see immediately)
- Open `/admin` → “Test Reward Wheel”
- Visually confirm:
  - Every other slice is a pack slice (no exceptions).
  - No “10,10,10” streaks (impossible with strict alternation).
- Spin a bunch of times:
  - Ensure the wheel lands and calls the backend claim function successfully for coins and packs.
  - Ensure “Open Sticker Pack” button still appears when you win a pack and works after closing/reopening the dialog.

Notes / tradeoffs (transparent)
- With this fix, slice frequency on the wheel will no longer try to approximate the probabilities. The probabilities are still honored for the actual reward selection (so functionality stays correct), but the wheel becomes a purely visual, symmetric display—which is exactly what you’re asking for.
- If later you want “alternation + slice frequencies roughly match probabilities,” we can do a second pass that assigns exactly 8 coin slots / 8 pack slots proportionally within each type. But for now, strict alternation is the priority.

PRE-CHANGE CHECKLIST (to be output again right before implementation in default mode)
□ Searched docs for: chore_wheel, reward wheel, SpinningWheel
□ Read files: src/components/chores/SpinningWheel.tsx, src/components/chores/ChoreRewardWheelDialog.tsx, src/components/admin/ChoreRewardWheelManager.tsx
□ Searched code for: expandedSlices, TARGET_SLICES, chore_wheel_config
□ Found patterns: yes — current logic derives 16 slices from probabilities then interleaves, which can produce streaks
□ Ready: yes
