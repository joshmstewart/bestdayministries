import { describe, it, expect, vi } from 'vitest';
import { validatePreviewSticker } from '../../supabase/functions/sticker-admin-api/previewValidation';

const id = '11111111-1111-4111-8111-111111111111';
describe('generator preview selection', () => {
  it('accepts a sticker in the same collection', async () => {
    expect(await validatePreviewSticker(id, 'collection-a', async () => ({ collection_id: 'collection-a' }))).toBeNull();
  });
  it('rejects a sticker in a different collection', async () => {
    expect(await validatePreviewSticker(id, 'collection-a', async () => ({ collection_id: 'collection-b' }))).toBe('preview_sticker_id must reference a sticker belonging to this same collection');
  });
  it('rejects a nonexistent sticker', async () => {
    expect(await validatePreviewSticker(id, 'collection-a', async () => null)).toBe('preview_sticker_id must reference a sticker belonging to this same collection');
  });
  it('null clears without a sticker lookup', async () => {
    const lookup = vi.fn();
    expect(await validatePreviewSticker(null, 'collection-a', lookup)).toBeNull();
    expect(lookup).not.toHaveBeenCalled();
  });
  it('rejects malformed identifiers', async () => {
    expect(await validatePreviewSticker('invalid', 'collection-a', async () => null)).toBe('preview_sticker_id must be a sticker UUID or null');
  });
});