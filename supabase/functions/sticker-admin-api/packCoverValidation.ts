export function validatePackCoverMode(mode: unknown): string | null {
  return mode === undefined || mode === 'rotate' || mode === 'choose'
    ? null : "pack_cover_mode must be rotate or choose";
}

export function validatePackImageUrls(value: unknown, storageOrigin: string): string | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) {
    return 'image_urls must contain 1 to 6 URLs';
  }
  const origin = new URL(storageOrigin).origin;
  for (const entry of value) {
    if (typeof entry !== 'string') return 'Every image URL must be a string';
    try {
      const url = new URL(entry);
      const prefix = '/storage/v1/object/public/sticker-images/';
      const path = decodeURIComponent(url.pathname);
      if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password ||
          !path.startsWith(prefix) || path.length <= prefix.length ||
          path.split('/').some(segment => segment === '.' || segment === '..' || segment.includes('\\'))) {
        return 'All image_urls must be public URLs from this project’s sticker-images bucket';
      }
    } catch {
      return 'Every image URL must be a valid sticker-images bucket URL';
    }
  }
  return null;
}