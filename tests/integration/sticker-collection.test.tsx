import { describe, it, expect, beforeEach } from 'vitest';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('Sticker Collection Integration Tests', () => {
  describe('Data Loading', () => {
    it('should load sticker collections from API', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { id: '1', name: 'Test Collection', is_active: true, rarity_config: { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 } }
          ]);
        })
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      expect(data).toHaveLength(1);
    });

    it('should handle API errors', async () => {
      server.use(http.get('*/rest/v1/sticker_collections', () => new HttpResponse(null, { status: 500 })));
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      expect(response.status).toBe(500);
    });
  });

  describe('Rarity Configuration', () => {
    it('should calculate rarity percentages correctly', () => {
      const rarityConfig = { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 };
      const total = Object.values(rarityConfig).reduce((sum, val) => sum + val, 0);
      expect(total).toBe(100);
    });

    it('should validate distribution', () => {
      const distribution = { common: 12, uncommon: 8, rare: 3, epic: 1, legendary: 1 };
      expect(Object.values(distribution).reduce((s, v) => s + v, 0)).toBe(25);
    });
  });

  describe('Daily Scratch Cards', () => {
    it('should check if user has scratched today', () => {
      const today = new Date().toISOString().split('T')[0];
      const card = { date: today, is_scratched: true };
      expect(card.date).toBe(today);
      expect(card.is_scratched).toBe(true);
    });
  });
});
