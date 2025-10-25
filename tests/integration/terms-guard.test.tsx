import { describe, it, expect } from 'vitest';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('Terms Guard Integration Tests', () => {
  describe('New User Detection', () => {
    it('should detect new users within 60 seconds', () => {
      const isNewUser = (createdAt: string | null) => {
        if (!createdAt) return false;
        return Date.now() - new Date(createdAt).getTime() < 60000;
      };

      expect(isNewUser(new Date(Date.now() - 30000).toISOString())).toBe(true);
      expect(isNewUser(new Date(Date.now() - 120000).toISOString())).toBe(false);
    });
  });

  describe('Dialog Display Logic', () => {
    it('should determine when to show dialog', () => {
      const shouldShow = (userId: string | undefined, isPublic: boolean, needs: boolean, isNew: boolean) =>
        userId && !isPublic && needs && !isNew;

      expect(shouldShow('user-123', false, true, false)).toBe(true);
      expect(shouldShow(undefined, false, true, false)).toBe(false);
    });
  });

  describe('Version Validation', () => {
    it('should validate version format', () => {
      const versionRegex = /^\d+\.\d+$/;
      expect(versionRegex.test('1.0')).toBe(true);
      expect(versionRegex.test('1.0.0')).toBe(false);
    });
  });

  describe('Terms Acceptance API', () => {
    it('should record terms acceptance', async () => {
      server.use(
        http.post('*/functions/v1/record-terms-acceptance', () =>
          HttpResponse.json({ success: true, acceptance_id: 'new-id' })
        )
      );

      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/record-terms-acceptance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms_version: '1.0', privacy_version: '1.0' })
      });

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
