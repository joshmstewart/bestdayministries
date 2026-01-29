
Context recap (what you want)
- On /sticker-album, clicking “Christmas” (or any other live set) must open a pack from THAT set, regardless of what stickers are currently being shown in the album grid.
- All live collections must be selectable/openable. No “latest set only” logic, and no ownership/locking gating for pack selection.

What’s actually broken (confirmed in code)
1) StickerAlbum’s pack click logic only opens if there’s already an unopened card whose current `collection_id` matches the clicked collection
- In `src/components/StickerAlbum.tsx` (Available Packs section), it does:
  - `const cardForCollection = availableCards.find(c => c.collection_id === collection.id);`
  - On click: it only opens the dialog if `cardForCollection` exists.
- But your available cards are usually created for the featured/active collection (often Valentine’s). So for Christmas, `cardForCollection` is typically undefined → click doesn’t properly open Christmas.

2) StickerAlbum sets `selectedPackCollectionId` but never passes it into the PackOpeningDialog
- StickerAlbum stores `selectedPackCollectionId`, but renders:
  - `<PackOpeningDialog ... cardId={selectedCardId} onOpened={handleCardScratched} />`
  - It does NOT pass `collectionId={selectedPackCollectionId}`
- Meanwhile, `src/components/PackOpeningDialog.tsx` explicitly supports `collectionId` override and passes it to the backend function:
  - `supabase.functions.invoke('scratch-card', { body: { cardId, collectionId } })`
- So even when the UI “selects” Christmas, the dialog still opens the card’s default collection (Valentine’s).

3) Available Packs UI currently shows only 3 collections
- `collections.slice(0, 3)` is hard-limiting the visible pack thumbnails to 3. This is separate from the “opens the wrong pack” bug, but it conflicts with “all live sets should be openable” as you add more.

Why Community works (the pattern we will mimic)
- In `src/components/DailyScratchCard.tsx`, the “selected collection pack dialog” is wired correctly:
  - It opens PackOpeningDialog with BOTH:
    - `cardId={activeCard.id}`
    - `collectionId={selectedCollectionId}`
  - It also wires `onChangeCollection` to open `CollectionSelectorDialog`.

Implementation approach (minimal changes, maximum correctness)
We will treat “card” and “collection choice” as separate:
- Card = the spendable unopened pack instance (daily/bonus).
- Collection choice = which set you want that card to open (Christmas/Valentine/etc).
- Clicking a pack thumbnail should NOT depend on the card already being assigned to that collection.

Planned code changes

A) Fix pack opening on /sticker-album so “Christmas opens Christmas”
File: `src/components/StickerAlbum.tsx`

1) Change the Available Packs click handler
- Replace the “find a card for this collection” concept with:
  - “Pick the next available unopened card (e.g., `availableCards[0]`), then open it with `collectionId = clickedCollection.id`.”
- This ensures:
  - If you have an unopened card, you can open it into any live set you choose.

2) Pass the selected collection into PackOpeningDialog
- Update the PackOpeningDialog render to include:
  - `collectionId={selectedPackCollectionId ?? undefined}`
- This is the single most important wiring fix.

3) Add “Change Pack” support (same as Community)
- Provide `onChangeCollection` to PackOpeningDialog so the dialog’s “Change Pack” button works:
  - `onChangeCollection={() => { setShowScratchDialog(false); setShowCollectionSelector(true); }}`
- When the user picks a collection in `CollectionSelectorDialog`, we will:
  - set `selectedPackCollectionId` to the chosen collection
  - re-open the same card in PackOpeningDialog (do not change which card is being spent mid-flow)
  - `setShowScratchDialog(true)`

4) Do NOT change what collection is being browsed in the album grid when opening a pack
- Per your requirement: opening a pack is independent from what stickers are currently being displayed.
- So clicking the pack thumbnail will not call `setSelectedCollection(collection.id)` anymore.
- Browsing remains controlled by the dropdown.

5) Make “all live sets openable”
Two options (we’ll implement the simplest that satisfies your requirement cleanly):
- Option 1 (recommended): keep the “top 3” display but ensure “View All” lets you choose any collection AND opening works for any chosen set.
- Option 2: remove `.slice(0, 3)` and display all active collections with `flex-wrap` (like the Memory Match selection UI pattern).
Given your “all sets live” emphasis, I will implement Option 2 if you want the album page itself to always show every live pack. Otherwise Option 1 still allows opening any set via “View All”.

(If we do Option 2, we’ll use a responsive `flex flex-wrap gap-4 justify-center` layout to avoid horizontal scroll and keep selection easy.)

B) Small quality fix: remove the Radix Dialog accessibility warning
File: `src/components/StickerAlbum.tsx`
- The sticker detail dialog currently uses `aria-describedby={undefined}` which triggers warnings.
- Add a real `<DialogDescription className="sr-only">Sticker details</DialogDescription>` (or remove the override and include a description) so warnings stop.

C) Verify the header/nav issue (without touching Community unless required)
- Your current route is `/sticker-album`, which uses `src/pages/StickerAlbumPage.tsx` and already renders `<UnifiedHeader />`.
- The Community diff you pasted is unrelated to the StickerAlbum pack bug.
- During implementation we’ll verify whether the “header/nav gone” symptom is:
  - actually a crash/render error on /sticker-album (then we fix that),
  - or a misunderstanding from viewing StickerAlbum inside a modal (StickerBookButton’s dialog has no header by design),
  - or a separate CSS/layout regression.
- We will not change Community.tsx further unless we find a concrete, reproducible issue.

How we’ll test end-to-end (the exact scenario you described)
1) Go to /sticker-album.
2) Ensure you have an unopened card (daily or bonus).
3) Click Christmas pack thumbnail:
   - PackOpeningDialog opens and shows Christmas pack name/art.
   - Opening it awards a sticker from Christmas (not Valentine’s).
4) Repeat with Valentine’s / other live sets.
5) Hit “Change Pack” in the dialog and select Christmas:
   - It should still open Christmas for the same card.
6) Confirm the album grid can remain on any collection; it should not affect which pack opens.

Files expected to change
- `src/components/StickerAlbum.tsx` (primary fix: correct wiring + click behavior + optional “show all packs”)
- No backend changes required (PackOpeningDialog + backend function already support `collectionId` override)

Process compliance (your required workflow)
- Before any edits (once we switch out of plan mode), I will output:
  PRE-CHANGE CHECKLIST:
  □ Searched docs for: [sticker pack system terms]
  □ Read files: [StickerAlbum.tsx, PackOpeningDialog.tsx, DailyScratchCard.tsx, STICKER_PACK_SYSTEM.md]
  □ Searched code for: [PackOpeningDialog usage, collectionId prop, Available Packs click handler]
  □ Found patterns: yes (DailyScratchCard selected-collection override pattern)
  □ Ready: yes
