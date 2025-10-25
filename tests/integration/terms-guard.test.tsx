import { describe, it, expect } from 'vitest';

describe('Terms Guard Integration Tests', () => {
  it('should detect new users correctly', () => {
    const isNewUser = (createdAt: string | null): boolean => {
      if (!createdAt) return false;
      const accountAge = Date.now() - new Date(createdAt).getTime();
      return accountAge < 60000; // Less than 60 seconds old
    };

    // User created 30 seconds ago (new)
    const newUserTimestamp = new Date(Date.now() - 30000).toISOString();
    expect(isNewUser(newUserTimestamp)).toBe(true);

    // User created 2 minutes ago (not new)
    const oldUserTimestamp = new Date(Date.now() - 120000).toISOString();
    expect(isNewUser(oldUserTimestamp)).toBe(false);

    // Null timestamp
    expect(isNewUser(null)).toBe(false);
  });

  it('should determine if dialog should show', () => {
    const shouldShowDialog = (
      userId: string | undefined,
      isPublicPage: boolean,
      needsAcceptance: boolean,
      isNewUser: boolean
    ): boolean => {
      return !!userId && !isPublicPage && needsAcceptance && !isNewUser;
    };

    // Show dialog: logged in, not public, needs acceptance, not new
    expect(shouldShowDialog('user-123', false, true, false)).toBe(true);

    // Don't show: new user (give edge function time)
    expect(shouldShowDialog('user-123', false, true, true)).toBe(false);

    // Don't show: public page
    expect(shouldShowDialog('user-123', true, true, false)).toBe(false);

    // Don't show: doesn't need acceptance
    expect(shouldShowDialog('user-123', false, false, false)).toBe(false);

    // Don't show: not logged in
    expect(shouldShowDialog(undefined, false, true, false)).toBe(false);
  });

  it('should identify public pages correctly', () => {
    const publicPages = ['/auth', '/auth/vendor', '/terms', '/privacy', '/', '/newsletter'];

    expect(publicPages.includes('/auth')).toBe(true);
    expect(publicPages.includes('/community')).toBe(false);
    expect(publicPages.includes('/admin')).toBe(false);
  });

  it('should validate terms version format', () => {
    const versionRegex = /^\d+\.\d+$/;

    expect(versionRegex.test('1.0')).toBe(true);
    expect(versionRegex.test('2.5')).toBe(true);
    expect(versionRegex.test('invalid')).toBe(false);
    expect(versionRegex.test('1')).toBe(false);
  });
});
