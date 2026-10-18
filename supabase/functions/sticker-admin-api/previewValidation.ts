export async function validatePreviewSticker(
  value: unknown,
  collectionId: string,
  findSticker: (id: string) => Promise<{ collection_id: string } | null>,
): Promise<string | null> {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return 'preview_sticker_id must be a sticker UUID or null';
  }
  const sticker = await findSticker(value);
  if (!sticker || sticker.collection_id !== collectionId) {
    return 'preview_sticker_id must reference a sticker belonging to this same collection';
  }
  return null;
}