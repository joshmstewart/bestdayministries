

## Show Collection Pack Image and Description in Sticker Album

### Problem
The hero section code was added but isn't appearing. After thorough investigation, the code is present at lines 715-743 of `StickerAlbum.tsx` and the database has the data (`pack_image_url` and `theme` for Spring 2026). The most likely cause is a build timing issue, but to be safe, the fix will restructure the code to be more robust and also add a `console.log` to confirm data is flowing correctly.

### Changes

**File: `src/components/StickerAlbum.tsx`**

1. Replace the inline IIFE (immediately invoked function) with a cleaner pattern using a `useMemo`-style variable computed from existing state -- this avoids potential rendering quirks with IIFEs inside JSX
2. Compute `currentCollection` as a derived variable at the top of the render, not buried in an IIFE
3. Move the hero section to use that variable directly -- cleaner, easier to debug, guaranteed to re-render when `selectedCollection` or `collections` change

### Technical Detail

Replace the IIFE block (lines 715-743) with:

- Add a `const currentCollection = collections.find(c => c.id === selectedCollection)` near the top of the component's render body (around line 588, before the JSX return)
- Replace the IIFE with a straightforward conditional render block using that variable
- Add a temporary `console.log` so we can verify the data is flowing (will remove after confirming)

This is a structural cleanup -- same logic, but avoids the IIFE pattern which can occasionally cause issues with React's reconciliation.

