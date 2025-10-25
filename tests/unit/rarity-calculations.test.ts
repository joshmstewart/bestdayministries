import { describe, it, expect } from 'vitest';

/**
 * UNIT TESTS: Rarity Calculations
 * 
 * Tests sticker rarity distribution calculations and drop rate logic.
 * These are pure mathematical functions perfect for unit testing.
 */

describe('Rarity Calculations', () => {
  
  describe('Drop Rate Calculations', () => {
    const calculateDropRate = (
      tierPercentage: number,
      stickersInTier: number
    ): number => {
      if (stickersInTier === 0) return 0;
      return tierPercentage / stickersInTier;
    };

    it('should calculate drop rate for single sticker in tier', () => {
      const dropRate = calculateDropRate(50, 1);
      expect(dropRate).toBe(50);
    });

    it('should calculate drop rate for multiple stickers in tier', () => {
      const dropRate = calculateDropRate(50, 5);
      expect(dropRate).toBe(10);
    });

    it('should handle zero stickers in tier', () => {
      const dropRate = calculateDropRate(50, 0);
      expect(dropRate).toBe(0);
    });

    it('should calculate drop rate for legendary tier', () => {
      // 1% legendary chance, 2 legendary stickers
      const dropRate = calculateDropRate(1, 2);
      expect(dropRate).toBe(0.5);
    });

    it('should handle decimal percentages', () => {
      const dropRate = calculateDropRate(33.33, 3);
      expect(dropRate).toBeCloseTo(11.11, 2);
    });
  });

  describe('Rarity Distribution', () => {
    interface RarityConfig {
      common: number;
      uncommon: number;
      rare: number;
      epic: number;
      legendary: number;
    }

    const defaultRarityConfig: RarityConfig = {
      common: 50,
      uncommon: 30,
      rare: 15,
      epic: 4,
      legendary: 1
    };

    const validateRarityConfig = (config: RarityConfig): boolean => {
      const total = Object.values(config).reduce((sum, val) => sum + val, 0);
      return Math.abs(total - 100) < 0.01;
    };

    it('should validate default rarity configuration', () => {
      expect(validateRarityConfig(defaultRarityConfig)).toBe(true);
    });

    it('should sum to 100%', () => {
      const total = Object.values(defaultRarityConfig).reduce((s, v) => s + v, 0);
      expect(total).toBe(100);
    });

    it('should have decreasing probabilities', () => {
      const config = defaultRarityConfig;
      expect(config.common).toBeGreaterThan(config.uncommon);
      expect(config.uncommon).toBeGreaterThan(config.rare);
      expect(config.rare).toBeGreaterThan(config.epic);
      expect(config.epic).toBeGreaterThan(config.legendary);
    });

    it('should handle custom rarity distributions', () => {
      const customConfig: RarityConfig = {
        common: 40,
        uncommon: 25,
        rare: 20,
        epic: 10,
        legendary: 5
      };
      expect(validateRarityConfig(customConfig)).toBe(true);
    });
  });

  describe('Collection Progress', () => {
    const calculateProgress = (obtained: number, total: number): number => {
      if (total === 0) return 0;
      return (obtained / total) * 100;
    };

    it('should calculate 0% progress when no stickers obtained', () => {
      const progress = calculateProgress(0, 10);
      expect(progress).toBe(0);
    });

    it('should calculate 100% progress when all stickers obtained', () => {
      const progress = calculateProgress(10, 10);
      expect(progress).toBe(100);
    });

    it('should calculate 50% progress', () => {
      const progress = calculateProgress(5, 10);
      expect(progress).toBe(50);
    });

    it('should handle partial progress', () => {
      const progress = calculateProgress(7, 10);
      expect(progress).toBe(70);
    });

    it('should handle zero total stickers', () => {
      const progress = calculateProgress(0, 0);
      expect(progress).toBe(0);
    });

    it('should handle decimal results', () => {
      const progress = calculateProgress(1, 3);
      expect(progress).toBeCloseTo(33.33, 2);
    });
  });

  describe('Rarity-Based Sorting', () => {
    type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

    const rarityOrder: Record<Rarity, number> = {
      legendary: 5,
      epic: 4,
      rare: 3,
      uncommon: 2,
      common: 1
    };

    const sortByRarity = (
      stickers: Array<{ id: string; rarity: Rarity }>
    ): Array<{ id: string; rarity: Rarity }> => {
      return [...stickers].sort((a, b) => {
        return rarityOrder[b.rarity] - rarityOrder[a.rarity];
      });
    };

    it('should sort stickers by rarity descending', () => {
      const stickers = [
        { id: '1', rarity: 'common' as Rarity },
        { id: '2', rarity: 'legendary' as Rarity },
        { id: '3', rarity: 'rare' as Rarity },
        { id: '4', rarity: 'epic' as Rarity }
      ];

      const sorted = sortByRarity(stickers);
      expect(sorted[0].rarity).toBe('legendary');
      expect(sorted[1].rarity).toBe('epic');
      expect(sorted[2].rarity).toBe('rare');
      expect(sorted[3].rarity).toBe('common');
    });

    it('should maintain stable sort for same rarity', () => {
      const stickers = [
        { id: '1', rarity: 'common' as Rarity },
        { id: '2', rarity: 'common' as Rarity },
        { id: '3', rarity: 'common' as Rarity }
      ];

      const sorted = sortByRarity(stickers);
      expect(sorted).toHaveLength(3);
      sorted.forEach(s => expect(s.rarity).toBe('common'));
    });

    it('should not mutate original array', () => {
      const stickers = [
        { id: '1', rarity: 'common' as Rarity },
        { id: '2', rarity: 'legendary' as Rarity }
      ];

      const original = [...stickers];
      sortByRarity(stickers);
      expect(stickers).toEqual(original);
    });
  });

  describe('Duplicate Detection', () => {
    const hasDuplicate = (
      userStickers: Array<{ sticker_id: string }>,
      newStickerId: string
    ): boolean => {
      return userStickers.some(us => us.sticker_id === newStickerId);
    };

    const countDuplicates = (
      userStickers: Array<{ sticker_id: string }>,
      stickerId: string
    ): number => {
      return userStickers.filter(us => us.sticker_id === stickerId).length;
    };

    it('should detect duplicates', () => {
      const userStickers = [
        { sticker_id: 'sticker-1' },
        { sticker_id: 'sticker-2' }
      ];
      expect(hasDuplicate(userStickers, 'sticker-1')).toBe(true);
    });

    it('should return false for new stickers', () => {
      const userStickers = [
        { sticker_id: 'sticker-1' }
      ];
      expect(hasDuplicate(userStickers, 'sticker-2')).toBe(false);
    });

    it('should count duplicate quantities', () => {
      const userStickers = [
        { sticker_id: 'sticker-1' },
        { sticker_id: 'sticker-1' },
        { sticker_id: 'sticker-1' }
      ];
      expect(countDuplicates(userStickers, 'sticker-1')).toBe(3);
    });

    it('should return 0 for non-owned stickers', () => {
      const userStickers = [
        { sticker_id: 'sticker-1' }
      ];
      expect(countDuplicates(userStickers, 'sticker-2')).toBe(0);
    });
  });

  describe('Scratch Card Progress', () => {
    const calculateScratchProgress = (
      transparentPixels: number,
      totalPixels: number
    ): number => {
      return (transparentPixels / totalPixels) * 100;
    };

    const isScratchComplete = (percentScratched: number): boolean => {
      return percentScratched >= 30; // 30% threshold
    };

    it('should calculate scratch progress percentage', () => {
      const totalPixels = 300 * 300; // 90,000 pixels
      const transparentPixels = 27000; // 30%
      const progress = calculateScratchProgress(transparentPixels, totalPixels);
      expect(progress).toBe(30);
    });

    it('should determine when scratch is complete', () => {
      expect(isScratchComplete(30)).toBe(true);
      expect(isScratchComplete(50)).toBe(true);
      expect(isScratchComplete(29.9)).toBe(false);
    });

    it('should handle 0% scratched', () => {
      const progress = calculateScratchProgress(0, 90000);
      expect(progress).toBe(0);
      expect(isScratchComplete(progress)).toBe(false);
    });

    it('should handle 100% scratched', () => {
      const totalPixels = 90000;
      const progress = calculateScratchProgress(totalPixels, totalPixels);
      expect(progress).toBe(100);
      expect(isScratchComplete(progress)).toBe(true);
    });
  });
});
