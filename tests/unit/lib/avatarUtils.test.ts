import { describe, it, expect } from 'vitest';
import { getAvatarPath } from '@/lib/avatarUtils';

describe('avatarUtils', () => {
  describe('getAvatarPath', () => {
    it('returns correct path for valid avatar numbers', () => {
      const path1 = getAvatarPath(1);
      expect(path1).toContain('composite-1.png');
      
      const path12 = getAvatarPath(12);
      expect(path12).toContain('composite-12.png');
    });

    it('handles avatar numbers as strings', () => {
      const path = getAvatarPath('5');
      expect(path).toContain('composite-5.png');
    });

    it('returns default avatar for invalid numbers', () => {
      const path1 = getAvatarPath(0);
      const path2 = getAvatarPath(13);
      const path3 = getAvatarPath(-1);
      
      expect(path1).toContain('composite-1.png');
      expect(path2).toContain('composite-1.png');
      expect(path3).toContain('composite-1.png');
    });

    it('returns default avatar for null/undefined', () => {
      const path1 = getAvatarPath(null);
      const path2 = getAvatarPath(undefined);
      
      expect(path1).toContain('composite-1.png');
      expect(path2).toContain('composite-1.png');
    });
  });
});
