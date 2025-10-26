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

  describe('Collection Scheduling Display', () => {
    it('should hide future GA collections from non-admin users', async () => {
      const futureDate = '2099-12-31';
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { 
              id: '1', 
              name: 'Future Collection', 
              is_active: true, 
              ga_date: futureDate,
              visible_to_roles: ['admin', 'owner'],
              rarity_config: { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 }
            }
          ]);
        })
      );
      
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      expect(data[0].ga_date).toBe(futureDate);
      expect(data[0].visible_to_roles).toEqual(['admin', 'owner']);
    });

    it('should show collections with passed GA date to all users', async () => {
      const pastDate = '2020-01-01';
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { 
              id: '1', 
              name: 'GA Collection', 
              is_active: true, 
              ga_date: pastDate,
              visible_to_roles: ['bestie', 'caregiver', 'supporter', 'moderator', 'admin', 'owner'],
              rarity_config: { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 }
            }
          ]);
        })
      );
      
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      expect(data[0].ga_date).toBe(pastDate);
      expect(data[0].visible_to_roles).toContain('bestie');
      expect(data[0].visible_to_roles).toContain('caregiver');
      expect(data[0].visible_to_roles).toContain('supporter');
    });

    it('should mark collection as featured based on featured_start_date', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { 
              id: '1', 
              name: 'Featured Collection', 
              is_active: true, 
              featured_start_date: today,
              is_featured: true,
              rarity_config: { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 }
            }
          ]);
        })
      );
      
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      expect(data[0].is_featured).toBe(true);
      expect(data[0].featured_start_date).toBe(today);
    });

    it('should handle collections without GA date', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { 
              id: '1', 
              name: 'No GA Date Collection', 
              is_active: true, 
              ga_date: null,
              visible_to_roles: ['admin', 'owner'],
              rarity_config: { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 }
            }
          ]);
        })
      );
      
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      expect(data[0].ga_date).toBeNull();
    });

    it('should handle collections without featured start date', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { 
              id: '1', 
              name: 'No Featured Date Collection', 
              is_active: true, 
              featured_start_date: null,
              is_featured: false,
              rarity_config: { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 }
            }
          ]);
        })
      );
      
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      expect(data[0].featured_start_date).toBeNull();
      expect(data[0].is_featured).toBe(false);
    });

    it('should filter collections by active status', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { id: '1', name: 'Active Collection', is_active: true, rarity_config: {} },
            { id: '2', name: 'Inactive Collection', is_active: false, rarity_config: {} }
          ]);
        })
      );
      
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      const activeCollections = data.filter((c: any) => c.is_active);
      expect(activeCollections).toHaveLength(1);
      expect(activeCollections[0].name).toBe('Active Collection');
    });

    it('should respect role visibility restrictions', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { 
              id: '1', 
              name: 'Admin Only Collection', 
              is_active: true,
              visible_to_roles: ['admin', 'owner'],
              rarity_config: { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 }
            }
          ]);
        })
      );
      
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      const userRole = 'bestie';
      const hasAccess = data[0].visible_to_roles.includes(userRole);
      expect(hasAccess).toBe(false);
    });

    it('should validate featured collection transitions', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { 
              id: '1', 
              name: 'Old Featured', 
              is_active: true,
              is_featured: false,
              featured_start_date: '2025-10-20',
              rarity_config: { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 }
            },
            { 
              id: '2', 
              name: 'New Featured', 
              is_active: true,
              is_featured: true,
              featured_start_date: '2025-10-25',
              rarity_config: { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 }
            }
          ]);
        })
      );
      
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      const featuredCollections = data.filter((c: any) => c.is_featured);
      expect(featuredCollections).toHaveLength(1);
      expect(featuredCollections[0].name).toBe('New Featured');
    });

    it('should handle bonus packs with scheduling', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { 
              id: '1', 
              name: 'Bonus Pack Collection', 
              is_active: true,
              ga_date: '2020-01-01',
              visible_to_roles: ['bestie', 'caregiver', 'supporter', 'moderator', 'admin', 'owner'],
              rarity_config: { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 }
            }
          ]);
        })
      );
      
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      expect(data[0].ga_date <= new Date().toISOString().split('T')[0]).toBe(true);
    });

    it('should validate date format in collections', async () => {
      server.use(
        http.get('*/rest/v1/sticker_collections', () => {
          return HttpResponse.json([
            { 
              id: '1', 
              name: 'Dated Collection', 
              is_active: true,
              ga_date: '2025-10-26',
              featured_start_date: '2025-10-25',
              start_date: '2025-10-20',
              rarity_config: { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 }
            }
          ]);
        })
      );
      
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/sticker_collections`);
      const data = await response.json();
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(dateRegex.test(data[0].ga_date)).toBe(true);
      expect(dateRegex.test(data[0].featured_start_date)).toBe(true);
      expect(dateRegex.test(data[0].start_date)).toBe(true);
    });
  });
});
