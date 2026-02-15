

## Auto-Open Crop Dialog on Image Upload

Currently, when a user selects images via the file input, they are added to the pending list with no cropping step. The crop dialog only opens when the user manually clicks a crop button on a thumbnail.

### Change

**File: `src/pages/AlbumManagement.tsx`**

Modify the `handleImageSelect` function so that after reading the file previews, it automatically opens the crop dialog for the first newly added image.

Specifically, after the `setImagePreviews` call completes:
1. Calculate the index of the first new image (the current length of `selectedImages` before the new batch is added).
2. Set `cropImageIndex` to that index.
3. Set `showCropDialog` to `true`.

This means:
- Single image upload: crop dialog opens immediately for that image.
- Multi-image upload: crop dialog opens for the first image. After cropping (or canceling), the user can manually crop the remaining images via the existing crop buttons on each thumbnail.

No new state or components needed -- this reuses the existing `cropImageIndex`, `showCropDialog`, and `ImageCropDialog` with the aspect ratio selection that was just added.

### Technical Detail

```typescript
// In handleImageSelect, after setImagePreviews:
const firstNewIndex = selectedImages.length; // index before adding
// ... after previews are set:
setCropImageIndex(firstNewIndex);
setShowCropDialog(true);
```

The key is capturing `selectedImages.length` before the state update (to know the correct index of the first new image in the combined array).
