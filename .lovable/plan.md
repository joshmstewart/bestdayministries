
Goal
- Make the Daily Five popup (opened from the Daily Bar on /community) actually use the available width so the Wordle keyboard keys aren’t “thin/squished,” and so changing ENTER/BACKSPACE sizing has a visible effect.

What’s actually limiting it (root cause)
- The Daily Five popup is rendered inside `DialogContent` (shadcn/radix) which defaults to `w-full max-w-lg`.
- In `src/components/daily-features/DailyBar.tsx`, the Daily Five popup currently passes:
  - `w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-auto sm:max-w-lg`
- The `sm:w-auto` is the problem on desktop/tablet widths:
  - `w-auto` makes the dialog shrink-to-content.
  - The keyboard rows contain many flex items; when the container shrink-wraps, the row’s “natural/min-content” width becomes small, so every key becomes skinny.
  - That’s why it “looks exactly the same” and “unnecessarily thin” even after adjusting min-width on ENTER/BACKSPACE.

Repo evidence (files)
- `src/components/daily-features/DailyBar.tsx` (Daily Five DialogContent className)
- `src/components/ui/dialog.tsx` (DialogContent base classes include `w-full max-w-lg ...`)
- `src/components/daily-features/DailyFivePopup.tsx` (keyboard wrapped in `<div className="w-full">` so it will expand correctly once the dialog width is real)
- `src/components/wordle/WordleKeyboard.tsx` (special key sizing already adjusted, but currently masked by the dialog shrink-wrap)

Implementation approach (minimal + targeted)
1) Fix the dialog width behavior for Daily Five (primary fix)
   - Update the Daily Five `<DialogContent>` in `src/components/daily-features/DailyBar.tsx`:
     - Remove the `sm:w-auto` shrink-wrap behavior.
     - Override the default `max-w-lg` to allow a wider dialog on larger screens.
     - Use a single “responsive clamp” width so it’s:
       - nearly full width on mobile
       - a comfortable fixed-ish width on desktop (so keys have room)
   - Example direction (not exact final string yet, but the intended behavior):
     - `w-[min(640px,calc(100vw-1rem))] max-w-none`
     - (optional) reduce padding for more usable keyboard space: override `p-6` → `p-4` for this dialog only.

2) (Optional) Small spacing improvements if needed after widening
   - If it still feels narrow due to internal spacing:
     - Override dialog padding (`p-6` is chunky for this use case).
     - Ensure the keyboard wrapper remains `w-full` (it already is).
     - If we see extra shrink, add `min-w-0` to relevant wrappers, but I expect step (1) resolves it.

3) Verify the ENTER/BACKSPACE sizing actually applies after width is fixed
   - Once the dialog isn’t shrink-wrapped, your earlier request (smaller ENTER/BACKSPACE) will become visually obvious.
   - If you still want them even smaller after the widening, we can do a second pass to tweak special key min-width/padding.

Testing checklist (what I’ll do / what you can verify visually)
- On /community:
  - Open Daily Five from the Daily Bar and confirm the dialog is visibly wider.
  - Confirm the top keyboard row (Q–P) keys are no longer skinny.
  - Confirm ENTER/BACKSPACE no longer force the letter keys to compress.
- Toggle Lovable preview sizes (phone/tablet/desktop icon above preview) and verify:
  - Mobile: dialog is near full width without overflowing the screen.
  - Tablet/Desktop: dialog uses the wider clamp width (not shrink-to-content).
- Quick interaction smoke test:
  - Tap several letters quickly; confirm hit targets feel improved.
  - Use BACKSPACE and ENTER; confirm they are clickable and not visually dominant.

Files that will change (once you approve)
- `src/components/daily-features/DailyBar.tsx` (Daily Five dialog sizing classes)

Notes / guardrails
- I will not change the global `DialogContent` defaults in `src/components/ui/dialog.tsx` because that would affect every dialog in the app. This fix will be scoped to the Daily Five popup only.
