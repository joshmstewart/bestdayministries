export interface PackCoverCollection {
  pack_image_urls?: string[] | null;
  pack_image_url?: string | null;
  pack_cover_mode?: string | null;
}

export function getPackCovers(collection: PackCoverCollection): string[] {
  const covers = [...new Set(collection.pack_image_urls ?? [])];
  return covers.length > 0 ? covers : collection.pack_image_url ? [collection.pack_image_url] : [];
}

// Visual history only; shared across dialog instances for this browser session.
const lastCoverByUserAndCollection = new Map<string, string>();

export function pickRotatingPackCover(
  covers: string[], userId: string, collectionId: string, random = Math.random,
): string | null {
  const key = JSON.stringify([userId, collectionId]);
  const last = lastCoverByUserAndCollection.get(key);
  const unique = [...new Set(covers)];
  const candidates = unique.length > 1 ? unique.filter(cover => cover !== last) : unique;
  const cover = candidates[Math.floor(random() * candidates.length)] ?? null;
  if (cover) lastCoverByUserAndCollection.set(key, cover);
  return cover;
}