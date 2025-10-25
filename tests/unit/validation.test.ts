import { describe, it, expect } from 'vitest';

/**
 * UNIT TESTS: Validation Functions
 * 
 * Tests email, password, URL, and emoji validation logic.
 * These are pure functions perfect for unit testing.
 */

describe('Validation Functions', () => {
  
  describe('Email Validation', () => {
    const validateEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email.trim());
    };

    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('first+last@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('no-at-sign.com')).toBe(false);
      expect(validateEmail('@no-local-part.com')).toBe(false);
      expect(validateEmail('no-domain@.com')).toBe(false);
      expect(validateEmail('spaces in@email.com')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(' ')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });

    it('should trim whitespace before validation', () => {
      expect(validateEmail('  test@example.com  ')).toBe(true);
      expect(validateEmail('\ntest@example.com\n')).toBe(true);
    });
  });

  describe('Password Validation', () => {
    const validatePassword = (password: string): boolean => {
      return password.length >= 8;
    };

    const validatePasswordStrength = (password: string): {
      hasUppercase: boolean;
      hasLowercase: boolean;
      hasNumber: boolean;
      hasMinLength: boolean;
      isValid: boolean;
    } => {
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasMinLength = password.length >= 8;
      
      return {
        hasUppercase,
        hasLowercase,
        hasNumber,
        hasMinLength,
        isValid: hasUppercase && hasLowercase && hasNumber && hasMinLength
      };
    };

    it('should validate password length', () => {
      expect(validatePassword('short')).toBe(false);
      expect(validatePassword('longenough')).toBe(true);
    });

    it('should check for uppercase letters', () => {
      const result = validatePasswordStrength('Password123');
      expect(result.hasUppercase).toBe(true);
    });

    it('should check for lowercase letters', () => {
      const result = validatePasswordStrength('Password123');
      expect(result.hasLowercase).toBe(true);
    });

    it('should check for numbers', () => {
      const result = validatePasswordStrength('Password123');
      expect(result.hasNumber).toBe(true);
    });

    it('should require all criteria for strong password', () => {
      expect(validatePasswordStrength('Password123').isValid).toBe(true);
      expect(validatePasswordStrength('password123').isValid).toBe(false); // No uppercase
      expect(validatePasswordStrength('PASSWORD123').isValid).toBe(false); // No lowercase
      expect(validatePasswordStrength('PasswordABC').isValid).toBe(false); // No number
      expect(validatePasswordStrength('Pass123').isValid).toBe(false); // Too short
    });
  });

  describe('Friend Code Validation', () => {
    const validateFriendCode = (code: string): boolean => {
      const emojiRegex = /^[\p{Emoji}]{3}$/u;
      return emojiRegex.test(code);
    };

    it('should validate 3-emoji friend codes', () => {
      expect(validateFriendCode('🐶🐱🐭')).toBe(true);
      expect(validateFriendCode('🎮🎯🎪')).toBe(true);
    });

    it('should reject invalid friend codes', () => {
      expect(validateFriendCode('🐶🐱')).toBe(false); // Only 2 emojis
      expect(validateFriendCode('🐶🐱🐭🐹')).toBe(false); // 4 emojis
      expect(validateFriendCode('ABC')).toBe(false); // Not emojis
      expect(validateFriendCode('🐶 🐱 🐭')).toBe(false); // Has spaces
    });

    it('should handle empty strings', () => {
      expect(validateFriendCode('')).toBe(false);
    });
  });

  describe('URL Validation', () => {
    const isAbsoluteUrl = (url: string): boolean => {
      return url.startsWith('http://') || url.startsWith('https://');
    };

    const isInternalUrl = (url: string): boolean => {
      return url.startsWith('/') && !url.startsWith('//');
    };

    it('should identify absolute URLs', () => {
      expect(isAbsoluteUrl('https://example.com')).toBe(true);
      expect(isAbsoluteUrl('http://example.com')).toBe(true);
    });

    it('should identify internal URLs', () => {
      expect(isInternalUrl('/community')).toBe(true);
      expect(isInternalUrl('/events/123')).toBe(true);
    });

    it('should reject protocol-relative URLs', () => {
      expect(isInternalUrl('//example.com')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isAbsoluteUrl('/relative')).toBe(false);
      expect(isAbsoluteUrl('ftp://example.com')).toBe(false);
      expect(isInternalUrl('https://example.com')).toBe(false);
    });
  });

  describe('Rarity Percentage Validation', () => {
    const validateRarityPercentages = (percentages: Record<string, number>): {
      isValid: boolean;
      total: number;
      error?: string;
    } => {
      const total = Object.values(percentages).reduce((sum, val) => sum + val, 0);
      
      if (Math.abs(total - 100) > 0.01) {
        return {
          isValid: false,
          total,
          error: `Percentages must add up to 100%. Currently: ${total}%`
        };
      }
      
      return { isValid: true, total };
    };

    it('should validate correct rarity percentages', () => {
      const result = validateRarityPercentages({
        common: 50,
        uncommon: 30,
        rare: 15,
        epic: 4,
        legendary: 1
      });
      expect(result.isValid).toBe(true);
      expect(result.total).toBe(100);
    });

    it('should reject invalid totals', () => {
      const result = validateRarityPercentages({
        common: 50,
        uncommon: 30,
        rare: 15,
        epic: 4,
        legendary: 2 // Total = 101
      });
      expect(result.isValid).toBe(false);
      expect(result.total).toBe(101);
      expect(result.error).toContain('101%');
    });

    it('should handle floating point precision', () => {
      const result = validateRarityPercentages({
        common: 33.33,
        uncommon: 33.33,
        rare: 33.34
      });
      expect(result.isValid).toBe(true);
      expect(result.total).toBeCloseTo(100, 2);
    });

    it('should reject percentages that are too far off', () => {
      const result = validateRarityPercentages({
        common: 50,
        uncommon: 30,
        rare: 10
      });
      expect(result.isValid).toBe(false);
      expect(result.total).toBe(90);
    });
  });

  describe('Input Sanitization', () => {
    const sanitizeInput = (input: string): string => {
      return input.trim().replace(/\s+/g, ' ');
    };

    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
      expect(sanitizeInput('\nhello\n')).toBe('hello');
    });

    it('should normalize multiple spaces', () => {
      expect(sanitizeInput('hello    world')).toBe('hello world');
      expect(sanitizeInput('hello\n\nworld')).toBe('hello world');
    });

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
    });

    it('should preserve single spaces', () => {
      expect(sanitizeInput('hello world')).toBe('hello world');
    });
  });
});
