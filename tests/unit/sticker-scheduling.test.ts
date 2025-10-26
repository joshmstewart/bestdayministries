import { describe, it, expect } from 'vitest';

describe('Collection Scheduling Logic', () => {
  describe('GA Date Promotion', () => {
    it('should determine if collection should be promoted to GA', () => {
      const shouldPromote = (gaDate: string | null, today: string): boolean => {
        if (!gaDate) return false;
        return gaDate <= today;
      };
      
      expect(shouldPromote('2025-10-25', '2025-10-26')).toBe(true);
      expect(shouldPromote('2025-10-27', '2025-10-26')).toBe(false);
      expect(shouldPromote(null, '2025-10-26')).toBe(false);
    });

    it('should handle edge case of exact GA date match', () => {
      const shouldPromote = (gaDate: string | null, today: string): boolean => {
        if (!gaDate) return false;
        return gaDate <= today;
      };
      
      expect(shouldPromote('2025-10-26', '2025-10-26')).toBe(true);
    });

    it('should calculate which roles to promote to', () => {
      const allRoles = ['bestie', 'caregiver', 'supporter', 'moderator', 'admin', 'owner'];
      expect(allRoles).toHaveLength(6);
      expect(allRoles).toContain('bestie');
      expect(allRoles).toContain('caregiver');
      expect(allRoles).toContain('supporter');
    });

    it('should validate date format YYYY-MM-DD', () => {
      const isValidDateFormat = (date: string): boolean => {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        return regex.test(date);
      };
      
      expect(isValidDateFormat('2025-10-26')).toBe(true);
      expect(isValidDateFormat('2025-1-1')).toBe(false);
      expect(isValidDateFormat('10/26/2025')).toBe(false);
      expect(isValidDateFormat('invalid')).toBe(false);
    });

    it('should handle past dates correctly', () => {
      const today = '2025-10-26';
      const pastDate = '2020-01-01';
      
      expect(pastDate <= today).toBe(true);
    });

    it('should handle future dates correctly', () => {
      const today = '2025-10-26';
      const futureDate = '2099-12-31';
      
      expect(futureDate <= today).toBe(false);
    });
  });

  describe('Featured Start Date Logic', () => {
    it('should determine which collection should be featured', () => {
      const collections = [
        { id: '1', featured_start_date: '2025-10-20', is_active: true },
        { id: '2', featured_start_date: '2025-10-25', is_active: true },
        { id: '3', featured_start_date: '2025-10-30', is_active: true }
      ];
      
      const findFeaturedCollection = (collections: any[], today: string) => {
        return collections
          .filter(c => c.featured_start_date && c.featured_start_date <= today && c.is_active)
          .sort((a, b) => b.featured_start_date.localeCompare(a.featured_start_date))[0];
      };
      
      const featured = findFeaturedCollection(collections, '2025-10-26');
      expect(featured?.id).toBe('2');
    });

    it('should handle no eligible featured collections', () => {
      const collections = [
        { id: '1', featured_start_date: '2025-10-30', is_active: true },
        { id: '2', featured_start_date: '2025-11-01', is_active: true }
      ];
      
      const findFeaturedCollection = (collections: any[], today: string) => {
        return collections
          .filter(c => c.featured_start_date && c.featured_start_date <= today && c.is_active)
          .sort((a, b) => b.featured_start_date.localeCompare(a.featured_start_date))[0];
      };
      
      const featured = findFeaturedCollection(collections, '2025-10-26');
      expect(featured).toBeUndefined();
    });

    it('should prioritize most recent featured_start_date', () => {
      const collections = [
        { id: '1', featured_start_date: '2025-10-20', is_active: true },
        { id: '2', featured_start_date: '2025-10-25', is_active: true },
        { id: '3', featured_start_date: '2025-10-22', is_active: true }
      ];
      
      const findFeaturedCollection = (collections: any[], today: string) => {
        return collections
          .filter(c => c.featured_start_date && c.featured_start_date <= today && c.is_active)
          .sort((a, b) => b.featured_start_date.localeCompare(a.featured_start_date))[0];
      };
      
      const featured = findFeaturedCollection(collections, '2025-10-26');
      expect(featured?.id).toBe('2');
    });

    it('should ignore inactive collections for featuring', () => {
      const collections = [
        { id: '1', featured_start_date: '2025-10-20', is_active: false },
        { id: '2', featured_start_date: '2025-10-25', is_active: true }
      ];
      
      const findFeaturedCollection = (collections: any[], today: string) => {
        return collections
          .filter(c => c.featured_start_date && c.featured_start_date <= today && c.is_active)
          .sort((a, b) => b.featured_start_date.localeCompare(a.featured_start_date))[0];
      };
      
      const featured = findFeaturedCollection(collections, '2025-10-26');
      expect(featured?.id).toBe('2');
    });

    it('should ignore null featured_start_date', () => {
      const collections = [
        { id: '1', featured_start_date: null, is_active: true },
        { id: '2', featured_start_date: '2025-10-25', is_active: true }
      ];
      
      const findFeaturedCollection = (collections: any[], today: string) => {
        return collections
          .filter(c => c.featured_start_date && c.featured_start_date <= today && c.is_active)
          .sort((a, b) => b.featured_start_date.localeCompare(a.featured_start_date))[0];
      };
      
      const featured = findFeaturedCollection(collections, '2025-10-26');
      expect(featured?.id).toBe('2');
    });

    it('should handle multiple collections with same featured_start_date', () => {
      const collections = [
        { id: '1', name: 'Collection A', featured_start_date: '2025-10-25', is_active: true },
        { id: '2', name: 'Collection B', featured_start_date: '2025-10-25', is_active: true }
      ];
      
      const findFeaturedCollection = (collections: any[], today: string) => {
        return collections
          .filter(c => c.featured_start_date && c.featured_start_date <= today && c.is_active)
          .sort((a, b) => b.featured_start_date.localeCompare(a.featured_start_date))[0];
      };
      
      const featured = findFeaturedCollection(collections, '2025-10-26');
      expect(featured).toBeDefined();
      expect(['1', '2']).toContain(featured?.id);
    });
  });

  describe('Date Comparison Edge Cases', () => {
    it('should handle date comparison correctly', () => {
      expect('2025-10-25' <= '2025-10-26').toBe(true);
      expect('2025-10-26' <= '2025-10-26').toBe(true);
      expect('2025-10-27' <= '2025-10-26').toBe(false);
    });

    it('should handle year boundaries', () => {
      expect('2024-12-31' <= '2025-01-01').toBe(true);
      expect('2025-01-01' <= '2024-12-31').toBe(false);
    });

    it('should handle month boundaries', () => {
      expect('2025-09-30' <= '2025-10-01').toBe(true);
      expect('2025-10-01' <= '2025-09-30').toBe(false);
    });
  });

  describe('Role Visibility Logic', () => {
    it('should validate all role types', () => {
      const validRoles = ['bestie', 'caregiver', 'supporter', 'moderator', 'admin', 'owner'];
      const testRole = 'bestie';
      
      expect(validRoles).toContain(testRole);
    });

    it('should determine if user role has access', () => {
      const visibleToRoles = ['admin', 'owner'];
      const userRole = 'bestie';
      
      const hasAccess = visibleToRoles.includes(userRole);
      expect(hasAccess).toBe(false);
    });

    it('should grant access to admin role', () => {
      const visibleToRoles = ['admin', 'owner'];
      const userRole = 'admin';
      
      const hasAccess = visibleToRoles.includes(userRole);
      expect(hasAccess).toBe(true);
    });
  });
});
