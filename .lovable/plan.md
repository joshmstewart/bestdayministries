
## Compressed Avatar Thumbnails — Multi-Size Strategy ✅ IMPLEMENTED

### Summary
Added two compressed thumbnail sizes (128px and 256px) for fitness avatars to dramatically reduce image loading times across the app.

### What was done

1. **Database**: Added `thumbnail_sm_url` and `thumbnail_md_url` columns to `fitness_avatars`
2. **Edge Function**: Created `compress-fitness-avatars` — batch generates 128px and 256px thumbnails using ImageScript
3. **`useProfileAvatarUrl` hook**: Now fetches and caches `thumbnail_sm_url`
4. **`AvatarDisplay` component**: Uses small thumbnail (128px) for all display sizes (sm/md/lg), falls back to full image
5. **`ProfileAvatarPicker`**: Uses medium thumbnail (256px) in grid and purchase dialog
6. **`FitnessAvatarPicker`**: Uses medium thumbnail (256px) in grid
7. **`AvatarCropManager`**: Uses medium thumbnail in admin grid, added "Compress" button for batch processing
8. **`generate-avatar-image`**: Auto-generates both thumbnails when creating new avatars
9. **Admin UI**: "Compress (N)" button in Avatar Crop Settings shows count needing compression

### Next step for user
Go to Admin → Settings → Avatars → Crop tab and click the **"Compress"** button to generate thumbnails for all existing avatars.
