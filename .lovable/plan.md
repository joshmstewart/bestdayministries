

## Fix Video Thumbnails in Album Management

### Problem

Video thumbnails don't appear in the album admin grid because:

1. **Library videos**: When a video is selected from the library, its `cover_url` (from the `videos` table) is never copied into the `album_images.image_url` field. The `VideoPickerResult` interface doesn't even carry thumbnail info.
2. **Uploaded videos with no cover**: If a video has no `cover_url` set, there's no fallback -- just a generic play icon placeholder.
3. **YouTube videos**: The `SortableMediaItem` component already handles YouTube thumbnails via `getYouTubeThumbnail()`, but this only works if `youtube_url` is set, which it is -- so YouTube should work. The issue is primarily with uploaded/library videos.

### Changes

#### 1. Add `thumbnailUrl` to `VideoPickerResult` interface

**File: `src/components/album/VideoLibraryPickerDialog.tsx`**

- Add `thumbnailUrl?: string` to the `VideoPickerResult` interface
- When selecting a library video, include `video.cover_url || video.thumbnail_url` as `thumbnailUrl`
- When a video is uploaded via the dialog's upload tab, pass along the cover_url if available

#### 2. Store thumbnail as `image_url` when inserting video into album

**File: `src/pages/AlbumManagement.tsx`**

- In both video insert locations (editing existing album and saving new album), set `image_url: video.thumbnailUrl || null` so the thumbnail gets stored in the database
- This means `SortableMediaItem` will find it via its existing `media.image_url` check -- no changes needed there

#### 3. Auto-generate thumbnail from first frame for videos without covers

**File: `src/pages/AlbumManagement.tsx`**

- After inserting a video that has a `video_url` but no `thumbnailUrl`, use a hidden HTML5 `<video>` element to capture the first frame:
  - Create a video element, set `src`, wait for `loadeddata` event
  - Seek to 0.1s, draw the frame onto a canvas, export as JPEG blob
  - Upload the blob to storage and update `album_images.image_url`
- This runs as a background operation after the insert, so it doesn't block the UI
- Add a utility function `captureVideoFirstFrame(videoUrl: string): Promise<Blob | null>` for this

#### 4. Backfill existing album videos (optional enhancement)

- When loading album images, for any video entries where `image_url` is null and `video_id` is set, look up the video's `cover_url` from the `videos` table and use that as the display thumbnail (in-memory only, or update the record)

### Technical Detail

```typescript
// VideoPickerResult - add thumbnailUrl
export interface VideoPickerResult {
  type: 'upload' | 'youtube' | 'library';
  videoId?: string;
  url?: string;
  youtubeUrl?: string;
  caption?: string;
  thumbnailUrl?: string;  // NEW
}

// When selecting from library:
onVideoSelected({
  type: isYouTube ? 'youtube' : 'library',
  videoId: video.id,
  url: video.video_url || undefined,
  youtubeUrl: video.youtube_url || undefined,
  caption: caption.trim() || video.title,
  thumbnailUrl: video.cover_url || video.thumbnail_url || undefined,
});

// When inserting into album_images:
.insert({
  album_id: albumId,
  video_type: video.type === 'youtube' ? 'youtube' : 'upload',
  video_url: video.url || null,
  youtube_url: video.youtubeUrl || null,
  video_id: video.videoId || null,
  caption: video.caption || null,
  image_url: video.thumbnailUrl || null,  // NEW - store thumbnail
  display_order: videoOrder,
})

// First-frame capture utility
async function captureVideoFirstFrame(videoUrl: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.src = videoUrl;
    video.currentTime = 0.1;
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8);
    }, { once: true });
    video.addEventListener('error', () => resolve(null), { once: true });
    video.load();
  });
}
```

### Files Modified

- `src/components/album/VideoLibraryPickerDialog.tsx` - Add `thumbnailUrl` to interface and populate it
- `src/pages/AlbumManagement.tsx` - Use `thumbnailUrl` on insert, add first-frame capture fallback

