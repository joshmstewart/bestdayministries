
Goal
- Make the “Menu Items” popup reliably scroll so admins can always reach all items (mouse wheel, trackpad, and touch), including when the pointer is over the price number inputs.

What’s actually causing the “no movement”
- The Menu Items dialog is trying to use flex-based sizing (`flex flex-col` + `flex-1` on the `ScrollArea`) inside `DialogContent`, but the shared `DialogContent` component has a built-in `grid` layout class. In Tailwind, `grid` vs `flex` conflicts can result in the dialog not behaving as a flex column, which prevents the `ScrollArea` from getting a constrained height.
- Additionally, in column layouts, scrolling children often require `min-h-0` to allow the scroll container to shrink and become scrollable.
- Finally, number inputs frequently hijack the wheel/trackpad gesture (changing the value instead of scrolling), which feels like “scroll is broken” when your cursor is in the price controls.

Files involved
- src/components/admin/CashRegisterStoresManager.tsx (Menu Items dialog layout + ScrollArea usage)
- src/components/ui/dialog.tsx (base `DialogContent` includes `grid`)
- src/components/ui/scroll-area.tsx (Radix wrapper; likely OK, but we will verify behavior after layout fixes)

Implementation steps (what I will change)
1) Force the Menu Items dialog content to be a true flex column (no grid conflicts)
   - In `CashRegisterStoresManager.tsx`, update the Menu Items `<DialogContent>` className to:
     - Use Tailwind “important” utilities to guarantee flex wins over the base `grid`:
       - `!flex !flex-col`
     - Use an explicit height instead of only max-height so child sizing is deterministic:
       - `h-[80vh]` (keep `max-w-2xl`)
     - Keep `overflow-hidden` so only the ScrollArea scrolls (not the whole dialog)

   Result: the dialog will have a real fixed vertical space for the scroll region.

2) Make the ScrollArea the scrollable “middle” section reliably
   - Update the `<ScrollArea>` in the Menu Items dialog to:
     - `flex-1 min-h-0 pr-4 -mr-4`
     - Remove `max-h-[50vh]` (we’ll let it fill the remaining space of the `h-[80vh]` dialog)
   - Why: `min-h-0` is the key that allows a flex child to become scrollable instead of expanding to content height.

3) Prevent price inputs from eating the scroll gesture
   - Add `onWheel` handling to the two price `<Input type="number" ...>` fields:
     - On wheel, blur the input so the gesture scrolls the container instead of incrementing the number.
   - This makes scrolling work even when the user’s pointer is over the price fields.

4) Quick visual verification in preview (no guessing)
   - Open /admin → Cash Register Stores → Menu Items
   - Confirm:
     - You can scroll with mouse wheel/trackpad anywhere inside the list
     - Cursor over the number inputs still allows scrolling (does not “feel stuck”)
     - Scrollbar thumb appears and moves
     - Buttons in the footer remain fixed and visible while the list scrolls

5) Add a tiny “debug visibility” indicator (optional but recommended for trust)
   - At the top or bottom of the ScrollArea, show: “Items: X” (e.g., “Items: 12”)
   - This helps confirm the dialog contains more than what’s currently visible, and that scrolling is expected.

Edge cases covered
- Lots of menu items (20+): still scrolls
- Small screens: `h-[80vh]` keeps controls accessible
- Scrolling while focused in a number input: scroll still works
- No menu items: empty-state still centered and readable

Rollout / risk
- Low risk: changes are scoped to the Menu Items dialog layout and event handling.
- We are not changing shared ScrollArea behavior globally unless the above fixes still don’t work (unlikely). If needed, the fallback would be adding explicit viewport overflow styling in `src/components/ui/scroll-area.tsx`, but we’ll try the correct layout fix first.

After approval
- I’ll implement steps 1–3 in `CashRegisterStoresManager.tsx`, verify in preview, and only then consider any shared component changes if absolutely necessary.