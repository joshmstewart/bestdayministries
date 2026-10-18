import { describe, it, expect } from 'vitest';
import { withoutRoutingFields, databaseErrorMessage } from '../../supabase/functions/sticker-admin-api/requestFields';

describe('sticker API request fields', () => {
  it('does not insert the action column', () => {
    expect(withoutRoutingFields({ action: 'create_sticker', name: 'Maple Leaf', drop_rate: 4 })).toEqual({ name: 'Maple Leaf', drop_rate: 4 });
  });
  it('does not update routing identifiers', () => {
    expect(withoutRoutingFields({ action: 'update_sticker', sticker_id: 'id', name: 'Maple Leaf' })).toEqual({ name: 'Maple Leaf' });
  });
  it('returns the actual plain-object database message', () => {
    expect(databaseErrorMessage({ code: 'PGRST204', message: "Could not find the 'action' column" })).toBe("Could not find the 'action' column");
  });
});