

## Album Video Upload Issues and Unified Video Flow

### Problem 1: Videos can't be added when creating a new album
The current code requires an album to already exist in the database before a video can be added (the "Add Video" button checks for `editingAlbum` and shows an error if it's null). This means videos can only be added when editing an existing album, not when creating one for the first time.

### Problem 2: Two separate video upload systems
The album's "Add Video" dialog has its own independent video upload pipeline, completely separate from the Admin Media/Videos tab (VideoManager). This creates confusion and duplication.

### Solution: Unified Video Flow via Library Picker

Instead of having the album "Add Video" button open a separate upload dialog, it will open a **Video Library Picker** -- a dialog that shows all videos from the Media/Videos library. From there, the user can:

1. **Select an existing video** from the library to add to the album
2. **Upload a new video** using the full VideoManager upload form (embedded in a popup), which saves to the video library first, then auto-selects it for the album

### Implementation Steps

**Step 1: Create a VideoLibraryPickerDialog component**
- New file: `src/components/album/VideoLibraryPickerDialog.tsx`
- Shows a grid/list of all videos from the `videos` table (same data as Media tab)
- Each video card shows thumbnail, title, and a "Select" button
- Has an "Upload New Video" button at the top that opens the VideoManager upload form in a nested dialog
- When a video is selected (or newly uploaded), it calls `onVideoSelected` callback with the video ID and URL
- Also keeps the YouTube URL tab for quick YouTube embeds (no library entry needed)

**Step 2: Modify AlbumManagement.tsx**
- Replace the `AddVideoDialog` usage with the new `VideoLibraryPickerDialog`
- Allow video additions during album creation (not just editing):
  - Track pending videos in local state (alongside `selectedImages`)
  - When creating a new album, insert pending videos into `album_images` after the album is created (same pattern as images)
- When editing, insert directly into `album_images` as it does now

**Step 3: Update the onVideoAdded handler**
- For new albums: store video selections in a `pendingVideos` state array, display them in the form preview, and insert them during `handleSubmit`
- For existing albums: insert immediately into `album_images` as before, then refresh

**Step 4: Remove the standalone AddVideoDialog**
- The old `AddVideoDialog` with its own upload pipeline will be replaced by the new unified component

### Technical Details

```text
Current Flow:
  Album "Add Video" --> AddVideoDialog --> [Upload tab | YouTube tab | Library dropdown]
                                              |
                                        (separate upload to storage, no library entry)

New Flow:
  Album "Add Video" --> VideoLibraryPickerDialog
                            |
                            +--> Browse existing library videos --> Select --> Add to album
                            |
                            +--> "Upload New" --> VideoManager upload form (popup) --> saves to library --> auto-selects --> Add to album
                            |
                            +--> YouTube URL tab --> quick embed (no library entry)
```

### Files to Create/Modify
- **Create**: `src/components/album/VideoLibraryPickerDialog.tsx` -- new unified picker
- **Modify**: `src/pages/AlbumManagement.tsx` -- swap dialog, add pending video state for new albums, handle video insert during create
- **Delete (or archive)**: `src/components/album/AddVideoDialog.tsx` -- replaced by new component

