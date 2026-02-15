

## Robust HEIC Handling for Album Image Uploads

### Problem

The album upload flow has no HEIC support at all. Desktop Chrome doesn't natively handle HEIC files, so:
1. The `accept="image/*"` attribute may not include `.heic` files on desktop Chrome
2. The `file.type.startsWith("image/")` filter silently rejects HEIC files (whose MIME type is often empty on Chrome)
3. There's no conversion step -- unlike `ImageUploadWithCrop` which uses `heic2any`

### Changes

**File: `src/pages/AlbumManagement.tsx`**

1. **Add HEIC to file input accept attribute**
   - Change `accept="image/*"` to `accept="image/*,.heic,.heif"` so the file picker shows HEIC files on desktop

2. **Import HEIC utilities**
   - Import `isHeicFile` and `convertHeicToJpeg` from `@/lib/imageUtils` (already used in `ImageUploadWithCrop`)

3. **Add a converting loading state**
   - Add `const [isConvertingHeic, setIsConvertingHeic] = useState(false)` state
   - Show a loading indicator on the upload button area while conversion is in progress

4. **Update `handleImageSelect` to handle HEIC files**
   - Remove the strict `file.type.startsWith("image/")` filter; replace with a check that accepts image types OR HEIC files (using `isHeicFile`)
   - Before creating previews, loop through files and convert any HEIC files to JPEG using `convertHeicToJpeg`
   - Wrap conversion in try/catch per file -- if one file fails, skip it with a toast error and continue with the rest
   - Set `isConvertingHeic` true/false around the conversion loop
   - Show a toast like "Converting iPhone photos..." during conversion

5. **Disable upload button during conversion**
   - Disable the "Select Images" / "Add Images" button while `isConvertingHeic` is true
   - Show a spinner icon (`Loader2`) instead of the `Upload` icon during conversion

### Technical Detail

```typescript
// Updated filter - accept image/* OR heic/heif
const isImageOrHeic = (file: File) => 
  file.type.startsWith("image/") || isHeicFile(file);

const validFiles = files.filter(isImageOrHeic);

// Convert HEIC files before preview
setIsConvertingHeic(true);
const processedFiles: File[] = [];
for (const file of validFiles) {
  if (isHeicFile(file)) {
    try {
      const converted = await convertHeicToJpeg(file);
      processedFiles.push(converted);
    } catch (err) {
      toast.error(`Could not convert ${file.name}. Try exporting as JPEG first.`);
    }
  } else {
    processedFiles.push(file);
  }
}
setIsConvertingHeic(false);
```

This follows the exact same pattern already used in `ImageUploadWithCrop.tsx` and `imageUtils.ts`, keeping things consistent across the codebase.

