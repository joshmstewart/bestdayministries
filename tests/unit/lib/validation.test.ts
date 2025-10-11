import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword } from '@/lib/validation';

describe('validation', () => {
  describe('validateEmail', () => {
    it('accepts valid email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('email+tag@test.org')).toBe(true);
    });

    it('rejects invalid email addresses', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('test @example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('accepts passwords meeting requirements', () => {
      expect(validatePassword('Password123')).toBe(true);
      expect(validatePassword('MyP@ssw0rd')).toBe(true);
      expect(validatePassword('LongPassword123')).toBe(true);
    });

    it('rejects passwords that are too short', () => {
      expect(validatePassword('Pass1')).toBe(false);
      expect(validatePassword('Pw1')).toBe(false);
    });

    it('rejects passwords without numbers', () => {
      expect(validatePassword('PasswordOnly')).toBe(false);
    });

    it('rejects passwords without uppercase letters', () => {
      expect(validatePassword('password123')).toBe(false);
    });

    it('rejects empty passwords', () => {
      expect(validatePassword('')).toBe(false);
    });
  });
});
