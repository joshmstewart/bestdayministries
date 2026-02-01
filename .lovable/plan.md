
Goal
- Make the Reward Wheel reliably clickable again in the Admin “Test Reward Wheel” dialog (no “not-allowed” cursor unless it’s genuinely disabled, and clicks always start a spin).

What I found (from current code)
- In `ChoreRewardWheelDialog.tsx`, the wheel is rendered with:
  - `onSpinStart={startSpin}`
  - `disabled={hasSpunToday || loading}`
- In `SpinningWheel.tsx`, the clickable element is now a `<button>` with:
  - `disabled={disabled || isAnimating || spinning}`
  - cursor styles that switch to `cursor-not-allowed` when `(disabled || isAnimating || spinning)` is true.
- This means “wheel shown but click ignored / blocked cursor” can only happen if:
  1) `spinning` prop is true, or
  2) `isAnimating` is stuck true, or
  3) the click never reaches the `<button>` (some overlay is intercepting pointer events).

High-confidence likely root causes
1) State not being reset on dialog open
- In `ChoreRewardWheelDialog.tsx` when `open` becomes true, the effect resets `loading` and `wonPrize`, but it does NOT reset `spinning` and `claiming`.
- If the dialog was closed mid-spin or mid-claim, `spinning` can remain `true`, making the wheel’s `<button disabled>` and giving you the “not clickable” cursor even though the UI looks “fresh”.

2) Decorative overlay elements intercepting clicks
- `SpinningWheel.tsx` renders an absolute “outer glow ring” and an absolute pointer above the wheel.
- They currently do not explicitly use `pointer-events: none;`.
- If either overlaps the wheel’s clickable area (especially near the top where people click), clicks can be swallowed even though the wheel appears interactive.

3) Timer cleanup / animation state edge case
- `SpinningWheel.tsx` uses `setTimeout` to end animation after 4s but does not clear it on unmount.
- If the component unmounts/remounts during a spin, it can create “stuck” state scenarios (less likely than #1, but worth hardening).

Plan (implementation steps)
1) Add a “wheel debug banner” (temporary, removable later)
- In `ChoreRewardWheelDialog.tsx`, render a small debug line under the title when in admin testing mode showing:
  - `loading`, `spinning`, `hasSpunToday`, `claiming`, `segments.length`
- Purpose: immediately confirm whether the wheel is actually disabled due to state vs. click interception.

2) Reset dialog state on open to guarantee a clean slate
- In `ChoreRewardWheelDialog.tsx`, inside the `useEffect` that runs when `open` changes to true:
  - Set `setSpinning(false)` at the start
  - Set `setClaiming(false)` at the start
  - Set `setHasSpunToday(false)` at the start (then re-compute it from the DB query)
  - Keep existing `setLoading(true)` and `setWonPrize(null)`
- Result: reopening the dialog cannot be “stuck disabled” from previous state.

3) Make the disabled logic explicit and consistent
- In `ChoreRewardWheelDialog.tsx`, define a single derived boolean:
  - `const wheelDisabled = loading || hasSpunToday || claiming;`
- Pass that to the wheel:
  - `disabled={wheelDisabled}`
- And use the same boolean for the “Spin the Wheel!” button disabled state (or keep its current logic, but ensure it matches the wheel).
- Result: cursor/disabled state matches the real interaction rules, and claiming state can’t accidentally allow extra clicks.

4) Ensure no overlay element can intercept clicks
- In `SpinningWheel.tsx`, add `pointer-events-none` (Tailwind) to:
  - The outer glow ring `<div>`
  - The pointer `<div>` wrapper and/or the `<svg>`
- Also add `aria-label` and keep the clickable surface only on the button.
- Result: every click that visually targets the wheel reaches the `<button>`.

5) Remove the fragile pointerEvents inline style on the button
- Right now the button style includes `pointerEvents: disabled ? "none" : "auto"`.
- This is risky because it uses only the `disabled` prop, while the actual `<button disabled>` condition also includes `isAnimating || spinning`.
- Plan: remove the inline `pointerEvents` style entirely and rely on:
  - the `disabled` attribute
  - cursor/opacity classes
- Result: no mismatch between “disabled” behavior and pointer-events.

6) Harden animation lifecycle so `isAnimating` can’t get stuck
- In `SpinningWheel.tsx`:
  - Store the `setTimeout` id in a ref
  - Clear it on unmount and before starting a new spin
  - Also cancel the tick requestAnimationFrame on unmount (already done) and ensure it’s cleared on spin end too.
- Result: even if the dialog closes mid-spin, reopening won’t inherit broken animation state.

7) Verify end-to-end in the Admin flow
- Steps to test after changes:
  1) Admin → Chores → Reward Wheel → “Test Reward Wheel” opens and shows wheel + “Spin the Wheel!” button
  2) Clicking the wheel anywhere starts spin (cursor is pointer)
  3) Closing dialog mid-spin, reopening: wheel is still clickable (spinning resets)
  4) Winning a prize transitions to claiming state and disables wheel + button only while claiming
  5) Reset Today’s Spin in Admin then re-open dialog: should be “fresh” and clickable again

Files that will be changed (once approved)
- `src/components/chores/ChoreRewardWheelDialog.tsx`
  - Reset state on open, unify disabled logic, add temporary debug banner
- `src/components/chores/SpinningWheel.tsx`
  - Add pointer-events-none to decorative elements, remove inline pointerEvents, add timer cleanup

Notes / non-goals
- This plan focuses on restoring click reliability first. Once stable, we can keep your prettier gradients/background work and continue iterating on design safely.

PRE-CHANGE CHECKLIST:
□ Searched docs for: reward wheel, chore_wheel, spin-chore-wheel, ChoreRewardWheel (no docs found)
□ Read files: src/components/chores/SpinningWheel.tsx, src/components/chores/ChoreRewardWheelDialog.tsx, src/components/admin/ChoreRewardWheelManager.tsx, supabase/functions/spin-chore-wheel/index.ts
□ Searched code for: spin-chore-wheel, ChoreRewardWheelDialog usage
□ Found patterns: yes — dialog loads config + checks today’s spin; wheel uses internal isAnimating + external spinning prop
□ Ready: yes
