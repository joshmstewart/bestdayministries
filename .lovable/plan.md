

## Unify Album Media Upload Experience

### What Changes for You

- The two separate buttons ("Select Images" and "Add Video") merge into one "Add Media" button that accepts both photos and videos
- A second "Video Library" button stays for picking existing videos or YouTube links
- Every pending item -- whether photo or video -- shows in one grid with a caption field underneath, so you can fill in metadata for each one the same way
- Videos uploaded from the file picker will show a progress bar and auto-generate a thumbnail from the first frame

### Metadata Handling (Captions)

- **Photos**: Same as today -- crop dialog first, then inline caption input
- **Videos from file picker**: Upload starts immediately in the background; inline caption input appears right away just like photos
- **Videos from library**: Caption is entered in the library picker dialog (unchanged)
- **After saving**: Both types get the same edit-caption button on the saved media grid (unchanged)

### Technical Details

#### 1. Standardize `video_type` values globally

**Files:** `VideoSection.tsx`, `SectionContentDialog.tsx`, `SupportPageManager.tsx`, `AlbumDetailDialog.tsx`

- Replace all `'uploaded'` string literals with `'upload'`
- Remove redundant fallback checks

#### 2. Unify file input to accept images and videos

**File: `src/pages/AlbumManagement.tsx`**

- Change `accept` attribute to `"image/*,.heic,.heif,video/mp4,video/webm,video/quicktime"`
- Rename button label to "Add Media"
- In `handleImageSelect`, detect file type:
  - `file.type.startsWith('image/')` or HEIC: existing image flow (HEIC convert, crop, queue to `selectedImages`)
  - `file.type.startsWith('video/')`: new inline video upload flow

#### 3. Inline video upload with progress and thumbnail

**File: `src/pages/AlbumManagement.tsx`**

- For video files from the file input:
  - Generate an immediate local thumbnail using `URL.createObjectURL` and `captureVideoFirstFrame`
  - Start uploading via `uploadWithProgress` to the `videos` storage bucket
  - Create a `videos` table record (registering in the video library)
  - Queue into `pendingVideos` with `thumbnailUrl` set to the local preview
  - Show upload progress as an overlay on the thumbnail
  - On completion, update the `pendingVideos` entry with the final URL

#### 4. Merge pending media into one grid with uniform caption inputs

**File: `src/pages/AlbumManagement.tsx`**

- Combine the two separate preview sections (images at line 1225 and videos at line 1268) into a single "Pending Media" grid
- Each item shows: thumbnail, type badge (Photo/Video/YouTube), crop button (images only), delete button, and an inline caption input
- For images, caption state stays in `imageCaptions[]`
- For videos, add editable caption support: update `pendingVideos[i].caption` on change

#### 5. Keep Video Library button as secondary option

- The "Video Library" button remains for browsing existing library videos or adding YouTube links
- Videos picked this way still go through the `VideoLibraryPickerDialog` where caption is entered before confirming

### Files Modified

| File | Change |
|------|--------|
| `src/components/VideoSection.tsx` | `'uploaded'` to `'upload'` |
| `src/components/admin/SectionContentDialog.tsx` | `'uploaded'` to `'upload'` |
| `src/components/admin/SupportPageManager.tsx` | `'uploaded'` to `'upload'` |
| `src/components/AlbumDetailDialog.tsx` | Remove redundant `'uploaded'` check |
| `src/pages/AlbumManagement.tsx` | Unified file input, inline video upload, merged pending media grid with caption inputs |

