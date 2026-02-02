
# Video Upload Improvements: Progress Indicator, Error Handling, and Compression

**STATUS: ✅ IMPLEMENTED**

This plan adds three major improvements to video uploads:
1. **Upload Progress Indicator** - Visual feedback showing upload percentage and estimated time
2. **Better Error Handling** - Clear, actionable error messages with timeouts
3. **Video Compression** - Automatic conversion to web-optimized MP4 format

## Why This Matters

Marla's issue shows the current UX problem: she selected a large MOV file, clicked upload, and saw "Uploading..." with no progress or timeout. She had no idea if it was working, stuck, or failed.

## Technical Approach

### 1. Upload Progress Indicator

**Problem**: Supabase JS client's `.upload()` method doesn't expose upload progress events.

**Solution**: Use `XMLHttpRequest` or `fetch` with upload progress events to upload directly to Supabase Storage REST API.

**Implementation**:
```text
┌─────────────────────────────────────────┐
│  Uploading video...                     │
│  ████████████░░░░░░░░░░  58%           │
│  42.3 MB / 73.1 MB                      │
│  Estimated time: ~45 seconds            │
│                              [Cancel]   │
└─────────────────────────────────────────┘
```

### 2. Video Compression with FFmpeg WASM

**Problem**: iPhone MOV files are often H.265/HEVC encoded, which doesn't play everywhere, and files are unnecessarily large for web use.

**Solution**: Use `@ffmpeg/ffmpeg` (FFmpeg compiled to WebAssembly) to transcode videos client-side before upload.

**Compression Settings**:
- Output format: MP4 (H.264 video, AAC audio)
- Target resolution: Max 1080p (downsample if larger)
- Video bitrate: ~2-4 Mbps (good quality, reasonable size)
- Audio bitrate: 128 Kbps
- Expected result: 50-80% size reduction for most phone videos

**User Flow**:
```text
┌─────────────────────────────────────────┐
│  Preparing video for upload...          │
│                                         │
│  Loading video processor (first time    │
│  only, ~31 MB download)                 │
│  ████████████████░░░░░░░░  67%          │
└─────────────────────────────────────────┘

       ↓ (after processor loads)

┌─────────────────────────────────────────┐
│  Optimizing video for web...            │
│                                         │
│  Converting to MP4 format               │
│  ████████████░░░░░░░░░░░░  48%          │
│                                         │
│  Original: 156.4 MB (MOV)               │
│  Estimated: ~35 MB (MP4)                │
│                              [Cancel]   │
└─────────────────────────────────────────┘

       ↓ (after compression)

┌─────────────────────────────────────────┐
│  Uploading video...                     │
│  ████████████████████░░░░  82%          │
│  28.7 MB / 35.0 MB                      │
│  Estimated time: ~12 seconds            │
└─────────────────────────────────────────┘
```

### 3. Error Handling Improvements

**Current Issues**:
- No timeout (can appear stuck forever)
- Generic error messages
- No recovery options

**Improvements**:
- 5-minute upload timeout with clear message
- Specific error messages for common issues (file too large, network error, auth expired)
- Retry button on failure
- Cancel button during upload

---

## Files to Create

### 1. `src/lib/videoCompression.ts`
Video compression utility using FFmpeg WASM:
- `loadFFmpeg()` - Load the WASM module (cached after first load)
- `compressVideo(file, options)` - Compress video with progress callback
- `getVideoInfo(file)` - Get video metadata (duration, resolution)
- Options: maxWidth (1920), quality ('medium'|'high'), onProgress callback

### 2. `src/components/VideoUploadProgress.tsx`
Reusable progress component:
- Shows current stage (loading processor / compressing / uploading)
- Progress bar with percentage
- File size info (original → compressed)
- Estimated time remaining
- Cancel button

---

## Files to Modify

### 1. `src/components/admin/VideoManager.tsx`
- Import and use new compression utility
- Replace simple `supabase.storage.upload()` with progress-aware upload
- Add compression step before upload
- Show `VideoUploadProgress` component during upload
- Add cancel/timeout logic

### 2. `src/components/album/AddVideoDialog.tsx`
- Same changes as VideoManager for consistency
- Import compression utility
- Add progress UI
- Add cancel button

### 3. `package.json`
Add new dependencies:
- `@ffmpeg/ffmpeg` - FFmpeg WASM core
- `@ffmpeg/util` - Utility functions for FFmpeg WASM

---

## User-Facing Changes

### Before (Current)
- User selects 150MB MOV file
- Clicks "Upload"
- Button shows "Uploading..." indefinitely
- No idea if working or stuck
- Must refresh page to escape

### After (Improved)
- User selects 150MB MOV file
- System shows "Preparing video for upload..."
- FFmpeg WASM loads (first time: ~31MB download, cached thereafter)
- Shows "Optimizing for web... 48%" with progress bar
- Shows "Original: 150MB → Estimated: ~35MB"
- Compression completes, now shows "Uploading... 82%" 
- Upload completes with success toast
- If anything fails: clear error message + retry button

---

## Technical Details

### FFmpeg WASM Compression Command
```
-i input.mov -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k -movflags +faststart output.mp4
```

This produces excellent quality at reasonable file sizes:
- `-preset medium` - Balance of speed and compression
- `-crf 23` - Good quality (18-28 range, lower = better)
- `-movflags +faststart` - Enables progressive playback

### Progress Tracking
1. **FFmpeg load progress**: Via `ffmpeg.on('log')` during core download
2. **Compression progress**: Parse FFmpeg log output for `time=` values, compare to total duration
3. **Upload progress**: XMLHttpRequest's `upload.onprogress` event

### Browser Compatibility
- FFmpeg WASM requires SharedArrayBuffer (most modern browsers)
- Fallback: Skip compression, upload original with warning about file size
- Test in Safari (Marla's likely browser) to ensure WASM works

---

## Implementation Order

1. **Install dependencies**: `@ffmpeg/ffmpeg`, `@ffmpeg/util`
2. **Create `videoCompression.ts`**: Core compression logic
3. **Create `VideoUploadProgress.tsx`**: Progress UI component
4. **Update `VideoManager.tsx`**: Integrate compression + progress
5. **Update `AddVideoDialog.tsx`**: Same integration
6. **Test**: Upload large MOV file, verify compression and progress

---

## Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| 150MB MOV upload time | Unknown (stuck) | ~30-60s visible progress |
| User confusion | High | None (clear feedback) |
| Failed upload recovery | Refresh page | Retry button |
| Storage usage | Large files | 50-80% smaller |
| Bandwidth | Large files | Smaller, faster uploads |

---

## Risk Mitigation

1. **FFmpeg WASM fails to load**: Fallback to direct upload with file-size warning
2. **Compression takes too long**: Show estimated time, allow cancel
3. **Browser doesn't support WASM**: Detect and skip compression
4. **Upload timeout**: 5-minute timeout with clear message and retry option
